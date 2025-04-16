import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers';
import { UserRole, User } from '../models/types';

// Extend Express Request type to include user
declare module 'express' {
    interface Request {
        user?: User;
    }
}

export class AuthMiddleware {
    constructor(private authController: AuthController) {}

    // Generic authentication middleware that takes a role
    private authenticate = (role: UserRole) => {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const token = this.extractToken(req);
                if (!token) {
                    res.status(401).json({ error: 'No token provided' });
                    return;
                }

                const user = this.authController[role](token);

                if (!user) {
                    res.status(401).json({ error: 'Invalid token' });
                    return;
                }

                // Attach user to request for use in routes
                req.user = user;
                next();
            } catch (error) {
                console.error('Authentication error:', error);
                res.status(500).json({ error: 'Authentication failed' });
            }
        };
    };

    // auth methods for specific roles
    public authenticateUser = this.authenticate(UserRole.USER);
    public authenticateAdmin = this.authenticate(UserRole.ADMIN);

    // Helper to extract token from Authorization header
    private extractToken(req: Request): string | null {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return null;
        }

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : null;
    }

}