import {createEventDispatcher } from "@wlindabla/event_dispatcher";
import {
    FetchRequest,
    FetchDelegateInterface,
    FetchResponseInterface,
    HttpClientEvents,
    FetchRequestEvent,
    FetchResponseEvent,
    RequestType,
    EventTargetType
} from './src';
import { addLog, clearLogs, updateStats } from "./utils-request-examples";

// ============================================================================
// IMPLÉMENTATION DU DELEGATE
// ============================================================================

/**
 * Delegate personnalisé pour logger toutes les étapes de la requête
 */
class LoggingFetchDelegate implements FetchDelegateInterface {
    private requestStartTimes: Map<Request, number> = new Map();

    /**
     * Appelé avant le démarrage de la requête
     */
    prepareRequest(request: Request): void {
        addLog('🔧 [Delegate] Préparation de la requête');
        addLog(`   📍 URL: ${request.url}`);
        addLog(`   🔤 Méthode: ${request.method}`);
        addLog(`   📦 Headers:${Object.fromEntries(request.headers.entries()) }`);
    }

    /**
     * Appelé au démarrage de la requête
     */
    requestStarted(request: Request): void {
        this.requestStartTimes.set(request, Date.now());
        addLog(`▶️ [Delegate] Requête démarrée à ${new Date().toLocaleTimeString()}`,'info');
    }

    /**
     * Appelé à la fin de la requête (succès ou erreur)
     */
    requestFinished(request: Request): void {
        const startTime = this.requestStartTimes.get(request);
        if (startTime) {
            const duration = Date.now() - startTime;
            addLog(`⏹️ [Delegate] Requête terminée en ${duration}ms`,'info');
            this.requestStartTimes.delete(request);
        }
    }

    /**
     * Appelé en cas d'erreur
     */
    requestErrored(request: Request, error: Error): void {
        addLog('❌ [Delegate] Erreur lors de la requête','error');
        addLog(`   💥 Message: ${error.message}`, 'error');
         addLog(`   📍 URL: ${request.url}`,'error');
        addLog(`   🔍 Stack:${error.stack}`, 'error');
        updateStats('failed');
    }

    /**
     * Appelé quand la réponse indique un échec (4xx, 5xx)
     */
    requestFailedWithResponse(request: Request, fetchResponse: FetchResponseInterface): void {
        addLog('⚠️ [Delegate] Réponse d\'échec reçue','warning');
        addLog(`   📍 URL: ${request.url}`,'warning');
        addLog(`   🔢 Status: ${fetchResponse.statusCode} ${fetchResponse.statusText}`,'warning');
        addLog(`   📦 Données:${fetchResponse.data}`, 'warning');

        if (fetchResponse.clientError) {
            addLog('   ⚡ Erreur client (4xx)','warning');
        }
        if (fetchResponse.serverError) {
            addLog('   💥 Erreur serveur (5xx)', 'warning');
        }
        updateStats('failed');
    }

    /**
     * Appelé quand la réponse est un succès (2xx)
     */
    requestSucceededWithResponse(request: Request, fetchResponse: FetchResponseInterface): void {
        addLog('✅ [Delegate] Réponse de succès reçue','success');
        addLog(`   📍 URL: ${request.url}`,'info');
        addLog(`   🔢 Status: ${fetchResponse.statusCode} ${fetchResponse.statusText}`,'info');
        addLog(`   📦 Type de contenu: ${fetchResponse.contentType}`);
        addLog(`   📦 Données:`, fetchResponse.data);
        updateStats('success');
    }

    /**
     * Appelé quand le traitement de la réponse a été empêché (preventDefault)
     */
    requestPreventedHandlingResponse(request: Request, fetchResponse: FetchResponseInterface): void {
        addLog('🛑 [Delegate] Traitement de la réponse empêché', 'warning');
        addLog(`   📍 URL: ${request.url}`,'info');

    }
}

/*
class SimpleEventDispatcher implements EventDispatcherInterface {
    private listeners: Map<string, Array<{ callback: Function; priority: number }>> = new Map();

    dispatch<T>(event: T, eventName?: string): T {
        const name = eventName || '';
        const listeners = this.listeners.get(name) || [];

        // Trier par priorité (plus haute en premier)
        listeners.sort((a, b) => b.priority - a.priority);

        for (const listener of listeners) {
            listener.callback(event);

            // Arrêter si la propagation est stoppée
            if ((event as any).isPropagationStopped?.()) {
                break;
            }
        }

        return event;
    }

    addListener(eventName: string, listener: Function, priority: number = 0): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        this.listeners.get(eventName)!.push({ callback: listener, priority });
    }

    removeListener(eventName: string, listener: Function): void {
        const listeners = this.listeners.get(eventName);
        if (listeners) {
            const index = listeners.findIndex(l => l.callback === listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    hasListeners(eventName?: string): boolean {
        if (!eventName) {
            return this.listeners.size > 0;
        }
        return this.listeners.has(eventName) && this.listeners.get(eventName)!.length > 0;
    }
}

*/
// ============================================================================
// EXEMPLES D'UTILISATION
// ============================================================================

// Configuration globale
const dispatcher =createEventDispatcher();
const delegate = new LoggingFetchDelegate();

// URL du serveur (ajuster selon votre environnement)
const BASE_URL = 'http://localhost:3000';

// ============================================================================
// Exemple 1: Requête GET simple
// ============================================================================

export async function exampleGetRequest() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 1: Requête GET simple');
    console.log('='.repeat(60) + '\n');

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users`,
            methodSend: 'GET',
            responseType: 'json',
            requestType: RequestType.MAIN,
            eventTarget: {
                type: EventTargetType.WINDOW,
                instance: typeof window !== 'undefined' ? window : null
            }
        }
    );

    try {
        const response = await request.handle();
        console.log('\n🎉 Requête terminée avec succès !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur lors de la requête:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 2: Requête POST avec données
// ============================================================================

export async function examplePostRequest() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 2: Requête POST - Créer un utilisateur');
    console.log('='.repeat(60) + '\n');

    const userData = {
        name: 'Franck Agbokoudjo',
        email: 'franck@wlindabla.com',
        role: 'developer'
    };

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users`,
            methodSend: 'POST',
            data: userData,
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log('\n🎉 Utilisateur créé avec succès !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur lors de la création:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 3: Requête PUT - Mise à jour complète
// ============================================================================

export async function examplePutRequest(userId: number|null = 1) {

    if (!userId) {
        const userIdPrompt = prompt("saisi l'identifiant de l'utilisateur a recuperer") || '2';
        userId = parseInt(userIdPrompt);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📖 EXEMPLE 3: Requête PUT - Mettre à jour l'utilisateur ${userId}`);
    console.log('='.repeat(60) + '\n');

    const updatedUser = {
        name: 'Franck Updated',
        email: 'franck.updated@wlindabla.com',
        role: 'senior-developer'
    };

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/${userId}`,
            methodSend: 'PUT',
            data: updatedUser,
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log('\n🎉 Utilisateur mis à jour !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur lors de la mise à jour:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 4: Requête PATCH - Mise à jour partielle
// ============================================================================

export async function examplePatchRequest(userId: number = 1) {
    if (!userId) {
        const userIdPrompt = prompt("saisi l'identifiant de l'utilisateur a recuperer") || '2';
        userId = parseInt(userIdPrompt);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📖 EXEMPLE 4: Requête PATCH - Mise à jour partielle de l'utilisateur ${userId}`);
    console.log('='.repeat(60) + '\n');

    const partialUpdate = {
        email: 'new.email@wlindabla.com'
    };

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/${userId}`,
            methodSend: 'PATCH',
            data: partialUpdate,
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log('\n🎉 Email mis à jour !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur lors de la mise à jour:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 5: Requête DELETE
// ============================================================================

export async function exampleDeleteRequest(userId: number = 3) {
    console.log('\n' + '='.repeat(60));
    console.log(`📖 EXEMPLE 5: Requête DELETE - Supprimer l'utilisateur ${userId}`);
    console.log('='.repeat(60) + '\n');

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/${userId}`,
            methodSend: 'DELETE',
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log('\n🎉 Utilisateur supprimé !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur lors de la suppression:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 6: Requête avec authentification (via événements)
// ============================================================================

export async function exampleAuthenticatedRequest() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 6: Requête avec authentification');
    console.log('='.repeat(60) + '\n');

    // Ajouter un listener pour l'authentification
    dispatcher.addListener(HttpClientEvents.BEFORE_SEND, (event: FetchRequestEvent) => {
        console.log('🔑 [Auth] Ajout du token d\'authentification');
        event.mergeFetchOptions({
            headers: {
                'Authorization': 'Bearer fake-jwt-token-123'
            }
        });
    });

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/1`,
            methodSend: 'GET',
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log(request)
        console.log('\n🎉 Requête authentifiée réussie !');
        return response;
    } catch (error) {
        console.error('\n💥 Erreur:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 7: Gestion d'erreur 404
// ============================================================================

export async function exampleNotFoundError() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 7: Gestion d\'erreur 404');
    console.log('='.repeat(60) + '\n');

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/999999`,
            methodSend: 'GET',
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();

        if (response.clientError) {
            console.log('\n⚠️ Erreur client détectée (404)');
        }

        return response;
    } catch (error) {
        console.error('\n💥 Erreur:', error);
        throw error;
    }
}

// ============================================================================
// Exemple 8: Annulation de requête
// ============================================================================

export async function exampleCancelRequest() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 8: Annulation de requête');
    console.log('='.repeat(60) + '\n');

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/slow`,
            methodSend: 'GET',
            responseType: 'json'
        }
    );

    // Annuler après 1 seconde
    setTimeout(() => {
        console.log('🚫 Annulation de la requête...');
        request.cancel();
    }, 1000);

    try {
        const response = await request.handle();
        return response;
    } catch (error) {
        if (request.isCancelled()) {
            console.log('\n✅ Requête annulée avec succès');
        }
        throw error;
    }
}

// ============================================================================
// Exemple 9: Transformation de réponse via événements
// ============================================================================

export async function exampleResponseTransformation() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 EXEMPLE 9: Transformation de réponse');
    console.log('='.repeat(60) + '\n');

    // Ajouter un listener pour transformer la réponse
    dispatcher.addListener(HttpClientEvents.RESPONSE, (event: FetchResponseEvent) => {
        console.log('🔄 [Transform] Transformation de la réponse en cours...');

        const response = event.getResponse();
        // Ajouter des métadonnées
        const transformedData = {
            timestamp: new Date().toISOString(),
            success: response.succeeded,
            statusCode: response.statusCode,
            originalData: response.data
        };
        
        response.setData(transformedData);

        event.setResponse(response)
        console.log('✨ [Transform] Réponse transformée:', transformedData);
    });

    const request = new FetchRequest(
        delegate,
        dispatcher,
        {
            url: `${BASE_URL}/users/1`,
            methodSend: 'GET',
            responseType: 'json'
        }
    );

    try {
        const response = await request.handle();
        console.log('request:',request)
        console.log('response:',response)
        console.log('response:', response.originalResponse.headers)
        console.log('response:', response.data)
        return response;
    } catch (error) {
        console.error('\n💥 Erreur:', error);
        throw error;
    }
}

// ============================================================================
// Fonction pour lancer tous les exemples
// ============================================================================

export async function runAllExamples() {
    console.log('\n\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(10) + '🚀 LANCEMENT DE TOUS LES EXEMPLES' + ' '.repeat(15) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');

    try {
        await exampleGetRequest();
        await new Promise(resolve => setTimeout(resolve, 1000));

        await examplePostRequest();
        await new Promise(resolve => setTimeout(resolve, 1000));

        await examplePutRequest(1);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await examplePatchRequest(1);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await exampleDeleteRequest(3);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await exampleAuthenticatedRequest();
        await new Promise(resolve => setTimeout(resolve, 1000));

        await exampleNotFoundError();
        await new Promise(resolve => setTimeout(resolve, 1000));

        await exampleResponseTransformation();

        console.log('\n\n');
        console.log('╔' + '═'.repeat(58) + '╗');
        console.log('║' + ' '.repeat(15) + '🎉 TOUS LES EXEMPLES TERMINÉS' + ' '.repeat(14) + '║');
        console.log('╚' + '═'.repeat(58) + '╝');
        console.log('\n');

    } catch (error) {
        console.error('\n❌ Une erreur est survenue:', error);
    }
}

// ============================================================================
// Export pour utilisation dans le navigateur ou Node.js
// ============================================================================

// Pour le navigateur
if (typeof window !== 'undefined') {
    (window as any).httpClientExamples = {
        exampleGetRequest,
        examplePostRequest,
        examplePutRequest,
        examplePatchRequest,
        exampleDeleteRequest,
        exampleAuthenticatedRequest,
        exampleNotFoundError,
        exampleCancelRequest,
        exampleResponseTransformation,
        runAllExamples
    };

    console.log('✅ Exemples disponibles dans window.httpClientExamples');
    console.log('💡 Utilisez: window.httpClientExamples.runAllExamples()');
}

// Pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exampleGetRequest,
        examplePostRequest,
        examplePutRequest,
        examplePatchRequest,
        exampleDeleteRequest,
        exampleAuthenticatedRequest,
        exampleNotFoundError,
        exampleCancelRequest,
        exampleResponseTransformation,
        runAllExamples
    };
}

document.addEventListener('click', async (event: Event) => {
    const target = (event.target as HTMLElement).closest('.test-fetch-request') as HTMLButtonElement;

    if (!target) return; 

    event.preventDefault();
    const functionName = target.getAttribute('name');

    const examplesContainer = (window as any).httpClientExamples;

    if (functionName && examplesContainer && typeof examplesContainer[functionName] === 'function') {
        try {
            target.disabled = true; 
            addLog(`🚀 Exécution de : ${functionName}...`, 'info');

            await examplesContainer[functionName]();

        } catch (error) {
            addLog(`❌ Erreur dans ${functionName}`, 'error');
            console.error(error);
        } finally {
            target.disabled = false;
        }
    } else {
        addLog(`⚠️ Action "${functionName}" introuvable.`, 'warning');
    }
});

// Gestionnaire pour le bouton "Effacer les logs"
document.addEventListener('click', (event: Event) => {
    const target = (event.target as HTMLElement).closest('.clearLogs');
    if (target) {
        clearLogs();
    }
});