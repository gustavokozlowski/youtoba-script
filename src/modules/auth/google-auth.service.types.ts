export interface GoogleAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUrl: string;
}

/** Corpo de erro do endpoint de token do OAuth: { error: 'invalid_grant', ... }. */
export interface OAuthErrorBody {
    error?: string;
}
