# Spec: API do Mix

Plano aprovado pelo dono em 22/11/2026. O Mix copia os vídeos de uma playlist de **origem** para o **fim** de uma playlist de **destino**, sem criar repetidos.

A regra que decide o que entra é o `planMix` (`src/modules/mix/mix-plan.ts`, #58).

## Integridade (não negociável)

- **A origem nunca é alterada:** nenhuma escrita nela.
- **O destino só ganha itens, sempre no fim:** `playlistItems.insert` sem `position`. Nada do destino é apagado nem reordenado pelo Mix.
- **Uma tarefa por playlist:** um Mix não começa se já houver qualquer job `running` no destino, seja remoção ou Mix. Uma remoção também não começa se houver um Mix rodando nela. O registro compartilhado `playlistJobs` (#57) garante isso.
- **Confirmação pelo número exato:** o `confirm` é comparado com `toAdd.length` calculado agora, numa leitura nova das duas playlists.
- **Repetir é seguro:** o que já entrou passa a ser "já no destino".
- **Registro do que entrou:** um arquivo em `BACKUP_DIR`, gravado antes do primeiro insert e atualizado a cada item. É ele que o desfazer (PR 3b) usa.
- **Logs:** sem título de vídeo, sem token e sem o objeto do erro HTTP (`apiFailure`).

## Rotas (PR 3a)

### `GET /playlist/:destino/mix?origem=<id>`: dry-run, sem escrita

Lê as duas playlists em paralelo e aplica o `planMix(origem, destino)`.

**200:**

```json
{
  "origem": { "playlistId": "PLa", "totalItens": 120 },
  "destino": { "playlistId": "PLb", "totalItens": 80 },
  "entram": [ /* formatEntry(...) na ordem da origem */ ],
  "pulados": {
    "jaNoDestino": [ /* formatEntry */ ],
    "repetidosNaOrigem": [ /* formatEntry + primeiraOcorrencia */ ],
    "indisponiveis": [ /* formatEntry + motivo: "apagado" | "privado" */ ]
  },
  "quota": { "unidadesLeitura": 5, "unidadesAdicao": 2000, "total": 2005, "limiteDiario": 10000, "cabeEmUmDia": true, "maxAdicoesPorDia": 199, "diasNecessarios": 1 },
  "quotaHoje": { /* formatQuotaSnapshot */ },
  "cabemHoje": 40,
  "paraAdicionar": "POST /playlist/PLb/mix?origem=PLa&confirm=40 (o que entra fica registrado para desfazer)"
}
```

- **Leitura:** custa 1 unidade por página de 50 de cada playlist.
- **Estimativa:** reaproveite o cálculo de `estimateRemovalQuota` (`src/modules/quota/quota-estimate.ts`), extraindo o miolo comum, sem copiar.
- **`cabemHoje`:** é `min(entram, floor(restante / 50))`.

### `POST /playlist/:destino/mix?origem=<id>&confirm=<N>`: começa o Mix

Ordem das checagens:

| Situação | Resposta |
|---|---|
| `origem` ausente ou fora de `^[A-Za-z0-9_-]{2,64}$`; `destino` também validado com o mesmo padrão | 400 `{ erro: "playlist_invalida", mensagem }` |
| `origem === destino` | 400 `{ erro: "mesma_playlist", mensagem }` |
| Já há job `running` no destino | 409 `{ erro: "already_running", mensagem, jobId, acompanhar }`, igual à remoção |
| Sem saldo para ler as duas playlists | 429 `daily_budget_exhausted`, igual à remoção |
| Falha de leitura (não conectado, não encontrada, cota do Google) | mesmo tratamento das rotas de playlist (`sendReadFailure`) |
| `entram` vazio | 200 `{ mensagem: "Nada novo para adicionar.", adicionados: 0, ...resumo }` |
| `confirm` ausente ou diferente de `entram.length` | 409 `{ erro: "confirmation_required", mensagem, ...dry-run }` |
| Saldo não cobre nenhum insert | 429 `daily_budget_exhausted` |
| Ok | 202 `{ mensagem: "Mix iniciado.", cabemHoje, acompanhar: "/jobs/<id>", ...formatMixJob }` |

- **Corrida:** como em `RemovalService.run`, a checagem de `already_running` é refeita logo antes do start, sem `await` entre ela e o start.
- **Ordem no start:** o registro é gravado antes do primeiro insert.

### Registro do Mix

Arquivo `BACKUP_DIR/mix-<destino>-<data>.json`, com `mode 0o600` e `flag 'wx'`, como o `writeBackup`:

```json
{ "version": 1, "kind": "mix", "sourceId": "PLa", "targetId": "PLb", "createdAt": "...",
  "planned": [ /* PlaylistEntry que vão entrar */ ],
  "added": [ { "videoId": "v1", "playlistItemId": "UEx..." } ],
  "failed": [ { "id": "v2", "status": 403, "reason": "..." } ],
  "updatedAt": "...", "finishedAt": "..." }
```

### Job do Mix

Fica no mesmo `playlistJobs`, com `playlistId` = destino e `kind: 'mix'`. Roda com `client.addVideosToPlaylist(destino, videoIds, { canSpend, onProgress })` (#57) e atualiza o registro a cada item.

**Status e paradas:**
- `status`: `running | done | partial | failed`, com o mesmo `stopReason` (`daily_budget | quota_exceeded`) da remoção.
- Pulado por falta de saldo conta como pendente.

**Corpo de `GET /jobs/:id` para um Mix (`formatMixJob`):**
- `jobId`, `tipo: "mix"`, `status`, `situacao`, `origem`, `destino`;
- `progresso: "N de M vídeos adicionados"`, `percentual`, `adicionados`, `total`, `falhas`, `pendentes`;
- `ultimoItem` (`posicao`, `titulo`, `resultado: "adicionado" | "falhou"`);
- `motivoParada`/`proximoPasso` quando parou por cota, `erro`, `iniciadoEm`, `terminadoEm`;
- `registro` (caminho do arquivo);
- `itens` (cada um com `estado: "adicionado" | "falhou" | "pendente"`);
- `quotaHoje`.

### `/jobs` e `/jobs/:id` passam a servir todos os tipos

- **Onde ficam:** saem do controller da remoção para `src/modules/jobs/` (`jobs.controller.ts`, `jobs.routes.ts`).
- **Formatação:** cada tipo de job formata o próprio corpo, por um mapa `kind → formatador`, sem `if` por tipo espalhado.
- **Corpo da remoção:** continua byte a byte igual ao de hoje, e os testes atuais não mudam.
- **Resumo do Mix em `GET /jobs`:** `jobId`, `playlistId` (destino), `origem`, `tipo: "mix"`, `status`, `situacao`, `adicionados`, `total`, `iniciadoEm`, `terminadoEm`.
- **Corpo de `GET /jobs`:** `{ remocoes: [...], mixes: [...] }`, cada lista com a mais recente primeiro. `remocoes` continua igual ao de hoje (só remoções, incluindo `mix_undo` na 3b), e os Mix vão em `mixes`, para o nome não mentir.
- **Campos fechados com o QA:**
  - `falhas` do Mix segue o formato da remoção, `[{ id: videoId, status, reason }]`;
  - `pendentes` é um número;
  - cada item em `itens` é um `formatEntry` mais `estado`;
  - `primeiraOcorrencia` é a posição na origem;
  - `maxAdicoesPorDia` é `floor((limiteDiario - unidadesLeitura) / 50)`, a mesma conta da remoção.
- **Ordem das checagens:** a validação dos ids (400) vem antes de tudo; o `already_running` vem antes de qualquer leitura no YouTube.

## PR 3b (depois): desfazer

`POST /mixes/:registro/undo?confirm=N`:
1. Valida o nome (`^mix-[A-Za-z0-9_-]+\.json$`, dentro de `BACKUP_DIR`). A validação de caminho do restore vira um helper comum.
2. Lê o destino agora e cruza com `added`. Só os itens do registro que ainda estão lá podem sair.
3. Pede confirmação pelo número exato.
4. Grava o backup do destino.
5. Remove pelo pipeline de remoção, com `kind: 'mix_undo'`.
