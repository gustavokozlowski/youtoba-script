import { useId } from 'react';
import logo from '../assets/logo.svg';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';

export function Entrar({ expired }: { expired: boolean }) {
    const titleId = useId();
    return (
        <main>
            {expired && (
                <Notice tone="warn" title="O login expirou">
                    Enquanto o app estiver em modo de teste no Google Cloud, o Google pede um novo login a cada 7 dias.
                    Entre de novo para continuar.
                </Notice>
            )}
            <section className="wall" aria-labelledby={titleId}>
                <div className="mist" aria-hidden="true" />
                <img className="hero-logo" src={logo} alt="youtoba" width="951" height="380" />
                <div className="copy">
                    <div>
                        <h1 id={titleId}>Limpa os vídeos repetidos das suas playlists</h1>
                        <p className="lead">
                            Roda só no seu computador, com a sua conta do YouTube. Você vê tudo o que vai sair antes de
                            apagar.
                        </p>
                    </div>
                    {/* Navegação de verdade: o servidor redireciona para o login do Google. */}
                    <a className="btn btn-ink btn-google" href="/auth/login">
                        <Icon name="google" />
                        Entrar com o Google
                    </a>
                </div>
                <div className="facts">
                    <p>
                        <b>Fica a primeira vez</b>Duplicado é o mesmo vídeo. A primeira aparição fica, as cópias saem.
                    </p>
                    <p>
                        <b>Nada some sem você ver</b>Revise a lista e confirme digitando quantos vídeos vão sair.
                    </p>
                    <p>
                        <b>Dá para desfazer</b>A playlist inteira é salva num backup antes de qualquer remoção.
                    </p>
                </div>
            </section>
        </main>
    );
}
