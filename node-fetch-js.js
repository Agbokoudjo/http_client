


async function main() {
  // Like the browser fetch API, the default method is GET
  const response = await fetch('https://jsonplaceholder.typicode.com/posts');
  const data = await response.json();
  console.log(data);
  // returns something like:
  //   {
  //   userId: 1,
  //   id: 1,
  //   title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  //   body: 'quia et suscipit\n' +
  //     'suscipit recusandae consequuntur expedita et cum\n' +
  //     'reprehenderit molestiae ut ut quas totam\n' +
  //     'nostrum rerum est autem sunt rem eveniet architecto'
  // }
}

main().catch(console.error);


async function mainPost() {
    // Data sent from the client to the server
const body = {
  title: 'foo',
  body: 'bar',
  userId: 1,
};

  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: {
      'User-Agent': 'undici-stream-example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  console.log(data);
  // returns something like:
  // { title: 'foo', body: 'bar', userId: 1, id: 101 }
}

mainPost().catch(console.error);


// Delegate de démonstration
class DemoFetchDelegate {
    prepareRequest(request) {
        addLog(`🔧 [Delegate] Préparation de la requête: ${request.method} ${request.url}`, 'info');
    }

    requestStarted(request) {
        addLog(`▶️ [Delegate] Requête démarrée: ${request.url}`, 'info');
    }

    requestFinished(request) {
        addLog(`⏹️ [Delegate] Requête terminée: ${request.url}`, 'info');
    }

    requestErrored(request, error) {
        addLog(`❌ [Delegate] Erreur: ${error.message}`, 'error');
        updateStats('failed');
    }

    requestFailedWithResponse(request, response) {
        addLog(`⚠️ [Delegate] Réponse d'échec (${response.statusCode}): ${request.url}`, 'warning');
        updateStats('failed');
    }

    requestSucceededWithResponse(request, response) {
        addLog(`✅ [Delegate] Succès (${response.statusCode}): ${request.url}`, 'success');
        addLog(`📦 Données reçues:`, 'info');
        addLog(JSON.stringify(response.data, null, 2), 'info');
        updateStats('success');
    }

    requestPreventedHandlingResponse(request, response) {
        addLog(`🛑 [Delegate] Traitement de la réponse empêché`, 'warning');
    }
}

