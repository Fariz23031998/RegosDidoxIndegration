/**
 * E-IMZO WebSocket service for certificate management and signing
 */

const EIMZO_WS_URL = "wss://127.0.0.1:64443/service/cryptapi";

export interface EimzoCertificate {
  disk: string;
  path: string;
  name: string;
  alias: string;
  cn?: string;
  serial?: string;
}

/**
 * List all available E-IMZO certificates
 */
export async function listEimzoCertificates(origin: string): Promise<EimzoCertificate[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(EIMZO_WS_URL);
    let resolved = false;
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
      }
    };
    
    ws.onopen = () => {
      // List certificates
      ws.send(JSON.stringify({
        plugin: "pfx",
        name: "list_all_certificates"
      }));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        const certs = response.certificates || [];
        
        if (certs.length === 0) {
          cleanup();
          ws.close();
          reject(new Error("No E-IMZO certificates found"));
          return;
        }
        
        cleanup();
        ws.close();
        resolve(certs);
      } catch (error: any) {
        cleanup();
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      cleanup();
      ws.close();
      reject(new Error("Failed to connect to E-IMZO client. Make sure E-IMZO is running."));
    };

    ws.onclose = (event) => {
      if (!resolved && event.code !== 1000) {
        resolved = true;
        reject(new Error("E-IMZO connection closed unexpectedly"));
      }
    };
  });
}

/**
 * Sign data using E-IMZO certificate
 * @param dataB64 Base64 encoded data to sign
 * @param origin Origin header for WebSocket connection
 * @param certificate Certificate object to use for signing
 * @returns Tuple of (pkcs7_64, signature_hex)
 */
export async function signWithEimzo(
  dataB64: string,
  origin: string,
  certificate: EimzoCertificate
): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(EIMZO_WS_URL);
    let step = 0;
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
      }
    };

    ws.onopen = () => {
      // Step 1: Load key
      ws.send(JSON.stringify({
        plugin: "pfx",
        name: "load_key",
        arguments: [
          certificate.disk,
          certificate.path,
          certificate.name,
          certificate.alias
        ]
      }));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        
        if (step === 0) {
          // Key loaded, get keyId
          const keyId = response.keyId;
          if (!keyId) {
            cleanup();
            ws.close();
            reject(new Error("Failed to load key"));
            return;
          }
          
          step = 1;
          // Step 2: Create PKCS7
          ws.send(JSON.stringify({
            plugin: "pkcs7",
            name: "create_pkcs7",
            arguments: [dataB64, keyId, "no"]
          }));
        } else if (step === 1) {
          // PKCS7 created
          if (!response.success) {
            cleanup();
            ws.close();
            reject(new Error(`Signing failed: ${JSON.stringify(response)}`));
            return;
          }
          
          cleanup();
          ws.close();
          resolve([response.pkcs7_64, response.signature_hex]);
        }
      } catch (error: any) {
        cleanup();
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      cleanup();
      ws.close();
      reject(new Error("Failed to connect to E-IMZO client during signing. Make sure E-IMZO is running."));
    };

    ws.onclose = (event) => {
      if (!resolved && event.code !== 1000) {
        resolved = true;
        reject(new Error("E-IMZO connection closed unexpectedly during signing"));
      }
    };
  });
}
