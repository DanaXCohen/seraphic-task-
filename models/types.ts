export interface Rule {
    id: number;
    type: string;
    displayName: string;
    priority: number;
    condition: string;
}

export interface SecurityPolicy {
    rules: Rule[];
    version?: number; // Adding a version to track changes
}

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user'
}

export interface User {
    id: string;
    role: UserRole;
}