import jwt from 'jsonwebtoken';

interface TokenPayload {
    id: string;
    role?: string;
}
interface RefreshTokenPayload {
    id: string;
}

export const generateToken = (payload: TokenPayload): string =>
    jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn:(process.env.JWT_EXPIRES_IN ) as jwt.SignOptions['expiresIn'] || "15m"});
export const verifyToken = (token: string): TokenPayload => 
    jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload
export const generateRefresToken = (payload: RefreshTokenPayload): string =>
    jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET as string, {expiresIn:(process.env.REFRESH_TOKEN_EXPIRES_IN ) as jwt.SignOptions['expiresIn'] || '7d'});
export const verifyRefreshToken = (token: string): RefreshTokenPayload => 
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as RefreshTokenPayload