import express from 'express';
import { SecurityPolicyService } from './services/security-policy-service';
import { PolicyController, AuthController } from './controllers';
import { AuthMiddleware } from './middlewares/authentication';
import { createPolicyRouter } from './routes/policy-routes';
import { createAuthRouter } from './routes/auth-routes';
import bodyParser from 'body-parser';

const POLICY_FILE_PATH = './policy.json';

interface Services {
    policyService: SecurityPolicyService;
    policyController: PolicyController;
    authController: AuthController;
    authMiddleware: AuthMiddleware;
}

// Initialize and configure all services needed for the application
export const initializeServices = async (): Promise<Services> => {
    try {
        // Create service instances
        const policyService = new SecurityPolicyService(POLICY_FILE_PATH);
        await policyService.init();

        const authController = new AuthController();
        const policyController = new PolicyController(policyService);
        const authMiddleware = new AuthMiddleware(authController);

        // Initialize all services needed
        await policyService.init();

        return {
            policyService,
            policyController,
            authController,
            authMiddleware
        };
    } catch (error) {
        console.error('Failed to initialize services:', error);
        throw new Error('Service initialization failed');
    }
};

export const createApp = (services: Services): express.Application => {
    const app = express();

    // Add body parser middleware
    app.use(bodyParser.json());

    const policyRouter = createPolicyRouter(services.policyController, services.authMiddleware);
    const authRouter = createAuthRouter(services.authController);

    app.use('/policy', policyRouter);
    app.use('/auth', authRouter);

    // Global error handler
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    return app;
};

const startServer = async () => {
    try {
        const services = await initializeServices();

        const app = createApp(services);
        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        return app;
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

const app = startServer();
export default app;