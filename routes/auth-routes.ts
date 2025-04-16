import { Router } from 'express';
import { AuthController } from '../controllers';

export const createAuthRouter = (
    authController: AuthController,
): Router => {
    const router = Router();

    // Login endpoint
    router.post('/login', authController.login);
    return router;
}; 