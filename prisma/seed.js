/**
 * Database Seeding Script
 * 
 * Seeds baseline data for new Supabase database
 * Idempotent: safe to run multiple times
 * 
 * Baseline Data:
 * - Default workspace (if no workspaces exist)
 * - Admin user (optional, if ADMIN_EMAIL provided)
 * 
 * Note: Does NOT seed personas (use migrate-personas.js for that)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

async function seedWorkspace() {
    logInfo('Checking for existing workspaces...');

    const workspaceCount = await prisma.workspace.count();

    if (workspaceCount > 0) {
        logInfo(`Found ${workspaceCount} existing workspace(s). Skipping workspace creation.`);
        return null;
    }

    logInfo('No workspaces found. Creating default workspace...');

    const workspace = await prisma.workspace.create({
        data: {
            name: 'Default Workspace',
            slug: 'default',
            description: 'Default workspace for AI Persona',
        },
    });

    logSuccess(`Created default workspace: ${workspace.name} (ID: ${workspace.id})`);
    return workspace;
}

async function seedAdminUser(workspaceId) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail) {
        logInfo('ADMIN_EMAIL not set. Skipping admin user creation.');
        logInfo('To create an admin user, set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
        return null;
    }

    if (!adminPassword) {
        logWarning('ADMIN_EMAIL is set but ADMIN_PASSWORD is not. Skipping admin user creation.');
        return null;
    }

    logInfo(`Checking for existing user: ${adminEmail}...`);

    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingUser) {
        logInfo(`User ${adminEmail} already exists. Skipping admin user creation.`);
        return existingUser;
    }

    logInfo(`Creating admin user: ${adminEmail}...`);

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            name: 'Admin User',
            emailVerified: true,
            verifiedAt: new Date(),
            isActive: true,
            workspaceMembers: {
                create: {
                    workspaceId: workspaceId,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
            },
        },
    });

    logSuccess(`Created admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    return adminUser;
}

async function main() {
    try {
        logSection('Database Seeding');

        // Seed workspace
        const workspace = await seedWorkspace();

        // Get workspace ID (either newly created or first existing)
        let workspaceId;
        if (workspace) {
            workspaceId = workspace.id;
        } else {
            const firstWorkspace = await prisma.workspace.findFirst();
            workspaceId = firstWorkspace?.id;
        }

        // Seed admin user (if workspace exists and ADMIN_EMAIL is set)
        if (workspaceId) {
            await seedAdminUser(workspaceId);
        } else {
            logWarning('No workspace available. Skipping admin user creation.');
        }

        // Summary
        logSection('Seeding Complete');

        const counts = {
            workspaces: await prisma.workspace.count(),
            users: await prisma.user.count(),
            personas: await prisma.persona.count(),
        };

        logInfo('Database Summary:');
        console.log(`  Workspaces: ${counts.workspaces}`);
        console.log(`  Users: ${counts.users}`);
        console.log(`  Personas: ${counts.personas}`);

        if (counts.personas === 0) {
            logInfo('\nTo migrate personas from old database, run:');
            console.log('  npm run migrate:personas');
        }

        logSuccess('Seeding completed successfully!');

    } catch (error) {
        log('❌ ERROR: Seeding failed', 'red');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
