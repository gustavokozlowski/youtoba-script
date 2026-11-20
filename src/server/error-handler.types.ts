/** O que o tratador precisa do logger (o pino satisfaz; nos testes, um vi.fn). */
export interface ErrorLog {
    error(details: object, message: string): void;
}

export interface ClientErrorReply {
    status: number;
    erro: string;
    mensagem: string;
}
