import {User, UserRole} from "../models/types";

export const users: Map<string, User> = new Map([
    ['admin1', { id: 'admin1', role: UserRole.ADMIN }],
    ['admin2', { id: 'admin2', role: UserRole.ADMIN }],
    ['admin3', { id: 'admin3', role: UserRole.ADMIN }],
    ['user1', { id: 'user1', role: UserRole.USER }],
    ['user2', { id: 'user2', role: UserRole.USER }],
    ['user3', { id: 'user3', role: UserRole.USER }],
]);