// ============================================================================
// Serveur de test Node.js pour @wlindabla/http_client
// Usage: node test-server.js
// ============================================================================

import * as http  from "node:http";
import url from 'node:url';

// Configuration
const PORT = 3000;
const HOST = 'localhost';

// Base de données simulée en mémoire
let users = [
    { id: 1, name: 'Franck Agbokoudjo', email: 'franck@wlindabla.com', role: 'admin' },
    { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user' },
    { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
];

let nextUserId = 4;

// Couleurs pour les logs
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Parse le body JSON
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Helper pour envoyer une réponse JSON
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization,X-Requested-With'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Créer le serveur
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Logs de la requête
    log(`${method} ${pathname}`, colors.cyan);

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization,X-Requested-With'
        });
        res.end();
        return;
    }

    try {
        // GET /users - Récupérer tous les utilisateurs
        if (pathname === '/users' && method === 'GET') {
            log('📋 Récupération de tous les utilisateurs', colors.green);
            sendJSON(res, 200, {
                success: true,
                count: users.length,
                data: users
            });
        }

        // GET /users/:id - Récupérer un utilisateur par ID
        else if (pathname.match(/^\/users\/\d+$/) && method === 'GET') {
            const id = parseInt(pathname.split('/')[2]);
            const user = users.find(u => u.id === id);

            if (user) {
                log(`👤 Utilisateur trouvé: ${user.name}`, colors.green);
                sendJSON(res, 200, {
                    success: true,
                    data: user
                });
            } else {
                log(`❌ Utilisateur ${id} non trouvé`, colors.red);
                sendJSON(res, 404, {
                    success: false,
                    error: 'User not found',
                    message: `No user found with ID ${id}`
                });
            }
        }

        // POST /users - Créer un nouvel utilisateur
        else if (pathname === '/users' && method === 'POST') {
            const body = await parseBody(req);
            
            if (!body.name || !body.email) {
                log('⚠️ Données manquantes pour la création', colors.yellow);
                sendJSON(res, 400, {
                    success: false,
                    error: 'Validation error',
                    message: 'Name and email are required'
                });
                return;
            }

            const newUser = {
                id: nextUserId++,
                name: body.name,
                email: body.email,
                role: body.role || 'user'
            };

            users.push(newUser);
            log(`✅ Nouvel utilisateur créé: ${newUser.name} (ID: ${newUser.id})`, colors.green);

            sendJSON(res, 201, {
                success: true,
                message: 'User created successfully',
                data: newUser
            });
        }

        // PUT /users/:id - Mettre à jour un utilisateur (remplacement complet)
        else if (pathname.match(/^\/users\/\d+$/) && method === 'PUT') {
            const id = parseInt(pathname.split('/')[2]);
            const body = await parseBody(req);
            const userIndex = users.findIndex(u => u.id === id);

            if (userIndex === -1) {
                log(`❌ Utilisateur ${id} non trouvé pour mise à jour`, colors.red);
                sendJSON(res, 404, {
                    success: false,
                    error: 'User not found'
                });
                return;
            }

            users[userIndex] = {
                id: id,
                name: body.name || users[userIndex].name,
                email: body.email || users[userIndex].email,
                role: body.role || users[userIndex].role
            };

            log(`✏️ Utilisateur ${id} mis à jour (PUT)`, colors.green);
            sendJSON(res, 200, {
                success: true,
                message: 'User updated successfully',
                data: users[userIndex]
            });
        }

        // PATCH /users/:id - Mise à jour partielle d'un utilisateur
        else if (pathname.match(/^\/users\/\d+$/) && method === 'PATCH') {
            const id = parseInt(pathname.split('/')[2]);
            const body = await parseBody(req);
            const userIndex = users.findIndex(u => u.id === id);

            if (userIndex === -1) {
                log(`❌ Utilisateur ${id} non trouvé pour patch`, colors.red);
                sendJSON(res, 404, {
                    success: false,
                    error: 'User not found'
                });
                return;
            }

            // Mise à jour partielle
            users[userIndex] = {
                ...users[userIndex],
                ...body
            };

            log(`🔧 Utilisateur ${id} partiellement mis à jour (PATCH)`, colors.green);
            sendJSON(res, 200, {
                success: true,
                message: 'User partially updated',
                data: users[userIndex]
            });
        }

        // DELETE /users/:id - Supprimer un utilisateur
        else if (pathname.match(/^\/users\/\d+$/) && method === 'DELETE') {
            const id = parseInt(pathname.split('/')[2]);
            const userIndex = users.findIndex(u => u.id === id);

            if (userIndex === -1) {
                log(`❌ Utilisateur ${id} non trouvé pour suppression`, colors.red);
                sendJSON(res, 404, {
                    success: false,
                    error: 'User not found'
                });
                return;
            }

            const deletedUser = users.splice(userIndex, 1)[0];
            log(`🗑️ Utilisateur ${id} supprimé: ${deletedUser.name}`, colors.yellow);

            sendJSON(res, 200, {
                success: true,
                message: 'User deleted successfully',
                data: deletedUser
            });
        }

        // GET /slow - Endpoint lent pour tester les timeouts
        else if (pathname === '/slow' && method === 'GET') {
            log('⏱️ Endpoint lent (délai 5s)', colors.yellow);
            setTimeout(() => {
                sendJSON(res, 200, {
                    success: true,
                    message: 'This was a slow response',
                    delay: '5000ms'
                });
            }, 5000);
        }

        // GET /error - Endpoint qui retourne une erreur 500
        else if (pathname === '/error' && method === 'GET') {
            log('💥 Simulation d\'erreur 500', colors.red);
            sendJSON(res, 500, {
                success: false,
                error: 'Internal Server Error',
                message: 'Something went wrong on the server'
            });
        }

        // POST /auth/login - Simulation de login
        else if (pathname === '/auth/login' && method === 'POST') {
            const body = await parseBody(req);
            
            if (body.email && body.password) {
                const token = 'fake-jwt-token-' + Date.now();
                log(`🔐 Login réussi pour: ${body.email}`, colors.green);
                
                sendJSON(res, 200, {
                    success: true,
                    message: 'Login successful',
                    data: {
                        token: token,
                        user: {
                            email: body.email,
                            name: 'Test User'
                        }
                    }
                });
            } else {
                log('⚠️ Login échoué - credentials invalides', colors.yellow);
                sendJSON(res, 401, {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid credentials'
                });
            }
        }

        // GET /health - Health check
        else if (pathname === '/health' && method === 'GET') {
            log('💚 Health check', colors.green);
            sendJSON(res, 200, {
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        }

        // 404 - Route non trouvée
        else {
            log(`❓ Route non trouvée: ${method} ${pathname}`, colors.red);
            sendJSON(res, 404, {
                success: false,
                error: 'Not Found',
                message: `Route ${method} ${pathname} not found`,
                availableRoutes: [
                    'GET /users',
                    'GET /users/:id',
                    'POST /users',
                    'PUT /users/:id',
                    'PATCH /users/:id',
                    'DELETE /users/:id',
                    'GET /slow',
                    'GET /error',
                    'POST /auth/login',
                    'GET /health'
                ]
            });
        }

    } catch (error) {
        log(`💥 Erreur serveur: ${error.message}`, colors.red);
        console.error(error);
        sendJSON(res, 500, {
            success: false,
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.green}🚀 Serveur de test démarré avec succès !${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`\n${colors.cyan}📍 URL: http://${HOST}:${PORT}${colors.reset}`);
    console.log(`${colors.yellow}⏰ Démarré à: ${new Date().toLocaleString()}${colors.reset}\n`);
    
    console.log(`${colors.bright}Routes disponibles:${colors.reset}`);
    console.log(`  ${colors.green}GET${colors.reset}    http://${HOST}:${PORT}/users`);
    console.log(`  ${colors.green}GET${colors.reset}    http://${HOST}:${PORT}/users/:id`);
    console.log(`  ${colors.blue}POST${colors.reset}   http://${HOST}:${PORT}/users`);
    console.log(`  ${colors.yellow}PUT${colors.reset}    http://${HOST}:${PORT}/users/:id`);
    console.log(`  ${colors.yellow}PATCH${colors.reset}  http://${HOST}:${PORT}/users/:id`);
    console.log(`  ${colors.red}DELETE${colors.reset} http://${HOST}:${PORT}/users/:id`);
    console.log(`  ${colors.green}GET${colors.reset}    http://${HOST}:${PORT}/health`);
    console.log(`  ${colors.blue}POST${colors.reset}   http://${HOST}:${PORT}/auth/login`);
    console.log(`  ${colors.green}GET${colors.reset}    http://${HOST}:${PORT}/slow (délai 5s)`);
    console.log(`  ${colors.green}GET${colors.reset}    http://${HOST}:${PORT}/error (erreur 500)\n`);
    
    console.log(`${colors.bright}Exemples de requêtes curl:${colors.reset}\n`);
    
    console.log(`${colors.cyan}# GET - Liste des utilisateurs${colors.reset}`);
    console.log(`curl http://${HOST}:${PORT}/users\n`);
    
    console.log(`${colors.cyan}# POST - Créer un utilisateur${colors.reset}`);
    console.log(`curl -X POST http://${HOST}:${PORT}/users \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"name":"Test User","email":"test@example.com"}'\n`);
    
    console.log(`${colors.cyan}# PUT - Mettre à jour un utilisateur${colors.reset}`);
    console.log(`curl -X PUT http://${HOST}:${PORT}/users/1 \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"name":"Updated Name","email":"updated@example.com"}'\n`);
    
    console.log(`${colors.cyan}# PATCH - Mise à jour partielle${colors.reset}`);
    console.log(`curl -X PATCH http://${HOST}:${PORT}/users/1 \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"email":"newemail@example.com"}'\n`);
    
    console.log(`${colors.cyan}# DELETE - Supprimer un utilisateur${colors.reset}`);
    console.log(`curl -X DELETE http://${HOST}:${PORT}/users/1\n`);
    
    console.log('='.repeat(60));
    console.log(`${colors.green}Appuyez sur Ctrl+C pour arrêter le serveur${colors.reset}\n`);
});

// Gestion de l'arrêt gracieux
process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}🛑 Arrêt du serveur...${colors.reset}`);
    server.close(() => {
        console.log(`${colors.green}✅ Serveur arrêté proprement${colors.reset}\n`);
        process.exit(0);
    });
});

// Gestion des erreurs non gérées
process.on('uncaughtException', (error) => {
    console.error(`${colors.red}💥 Erreur non gérée:${colors.reset}`, error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`${colors.red}💥 Promesse rejetée non gérée:${colors.reset}`, reason);
});