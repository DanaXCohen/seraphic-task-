import { Request, Response } from 'express';
import { UserRole, User } from '../models/types';
import jwt from 'jsonwebtoken';
import {users} from "../db/users";

const JWT_USER_SECRET = process.env.JWT_USER_SECRET || 'user-secret-key';
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-secret-key';

export class AuthController {

    public user(token: string): User | null {
        try {
            const decoded = jwt.verify(token, JWT_USER_SECRET) as { id: string };
            return users.get(decoded.id) || null;
        } catch (error) {
            return null;
        }
    }

    public admin(token: string): User | null {
        try {
            const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as { id: string };
            return users.get(decoded.id) || null;
        } catch (error) {
            return null;
        }
    }

    public async login(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.body;
            const user = users.get(userId);

            // In a real application, this would validate against a database
            if (user?.role === UserRole.ADMIN) {
                const token = jwt.sign(user, JWT_ADMIN_SECRET);
                res.json({ token });
            } else if (user?.role === UserRole.USER) {
                const token = jwt.sign(user, JWT_USER_SECRET);
                res.json({ token });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    };
}