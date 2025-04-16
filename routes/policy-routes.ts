import { Router } from 'express';
import { PolicyController } from '../controllers';
import { AuthMiddleware } from '../middlewares/authentication';

// Create and configure the policy routes
export const createPolicyRouter = (
    policyController: PolicyController,
    authMiddleware: AuthMiddleware
): Router => {
    const router = Router();

    // User routes - require user authentication
    router.get('/', authMiddleware.authenticateUser, policyController.getPolicy);
    router.get('/version', authMiddleware.authenticateUser, policyController.getPolicyVersion);

    // Admin routes - require admin authentication
    router.put('/', authMiddleware.authenticateAdmin, policyController.updatePolicy);

    return router;
};