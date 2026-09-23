import { createHmac } from 'node:crypto';

/**
 * EL ENCHUFE DE LA VENTANILLA (seccion 203). Copiado del `ventanilla-client`
 * del truco/ludo (`lib/api-spec/ventanilla-v1.yaml`), pasado a JS puro porque
 * este servidor no lleva TypeScript. La logica NO se toca: firma por operador,
 * claves idempotentes legibles, montos en unidad minima como string en el
 * JSON y bigint en el codigo, y los errores del contrato mapeados.
 *
 * ESTA TANDA SOLO USA `authenticate` y `balance` (Piso 1: las cuentas). Los
 * verbos de plata (bet, win, rollback, round-close, house-*) estan porque el
 * contrato es uno solo y el dia que el domino cobre no se reescribe nada, pero
 * NADIE los llama todavia: el Piso 3 espera.
 *
 * REGLA DE ORO: si esto se descubre escribiendo registro, login, saldo, KYC o
 * depositos, PARA. Eso lo da la PAM.
 */

export class VentanillaError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'VentanillaError';
    this.code = code;
    this.status = status ?? null;
  }
}

/** Las claves legibles: la clave DICE que es. */
export const claves = {
  bet: (gameId, roundId, playerId) => `bet:${gameId}:${roundId}:${playerId}`,
  win: (gameId, roundId, playerId) => `win:${gameId}:${roundId}:${playerId}`,
  rollback: (betTransactionId) => `rb:${betTransactionId}`,
  close: (gameId, roundId) => `close:${gameId}:${roundId}`,
  houseFund: (gameId, roundId) => `hf:${gameId}:${roundId}`,
  houseRefund: (gameId, roundId, etiqueta) => `hr:${gameId}:${roundId}:${etiqueta}`
};

/**
 * La firma amarra el cuerpo, el reloj y el PATH en minusculas y sin query
 * (contrato v1.0.0): una firma emitida para /bet no sirve en otro endpoint.
 */
export function firmar(secreto, rawBody, reloj, path) {
  return createHmac('sha256', secreto)
    .update(Buffer.from(rawBody, 'utf8'))
    .update(String(reloj))
    .update(path.toLowerCase())
    .digest('hex');
}

export function crearVentanilla(config) {
  const timeoutMs = config.timeoutMs ?? 5000;
  const fetchFn = config.fetchFn ?? fetch;
  const relojFn = config.relojFn ?? (() => Math.floor(Date.now() / 1000));

  async function unIntento(endpoint, body) {
    const raw = JSON.stringify(body);
    const reloj = relojFn();
    const urlCompleta = `${config.baseUrl}/pam/v1/${endpoint}`;
    const path = new URL(urlCompleta).pathname;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetchFn(urlCompleta, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ventanilla-operador': config.operatorId,
          'x-ventanilla-reloj': String(reloj),
          'x-ventanilla-firma': firmar(config.secretoHmac, raw, reloj, path)
        },
        body: raw,
        signal: ctrl.signal
      });
    } catch {
      throw new VentanillaError('PAM_UNREACHABLE', 'La PAM no respondió (red o timeout).', null);
    } finally {
      clearTimeout(timer);
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new VentanillaError(json.code ?? 'PAM_MAINTENANCE', json.message ?? `HTTP ${res.status}`, res.status);
    }
    return json;
  }

  /** `bet` reintenta UNA vez en corto; el resto, un intento. */
  async function llamar(endpoint, body, intentos) {
    let ultimo;
    for (let i = 0; i < intentos; i += 1) {
      try {
        return await unIntento(endpoint, body);
      } catch (err) {
        ultimo = err;
        if (!(err instanceof VentanillaError && err.code === 'PAM_UNREACHABLE')) throw err;
      }
    }
    throw ultimo;
  }

  const aPlata = (j) => ({
    balance: BigInt(j.balance),
    currency: j.currency,
    pamTransactionId: j.pamTransactionId,
    alreadyProcessed: Boolean(j.alreadyProcessed)
  });

  return {
    async authenticate(launchToken) {
      const j = await llamar('authenticate', { launchToken }, 1);
      return {
        playerToken: j.playerToken,
        playerId: j.playerId,
        displayName: j.displayName,
        currency: j.currency,
        balance: BigInt(j.balance)
      };
    },
    async balance(playerToken) {
      const j = await llamar('balance', { playerToken }, 1);
      return { balance: BigInt(j.balance), currency: j.currency };
    },
    // ---- de aqui para abajo, plata: NADIE los llama en esta tanda ----
    async bet(p) {
      return aPlata(await llamar('bet', { ...p, amount: p.amount.toString() }, 2));
    },
    async win(p) {
      return aPlata(await llamar('win', { ...p, amount: p.amount.toString() }, 1));
    },
    async rollback(p) {
      return aPlata(await llamar('rollback', { ...p }, 1));
    },
    async roundClose(p) {
      const j = await llamar('round-close', { ...p }, 1);
      return { rake: BigInt(j.rake), alreadyProcessed: Boolean(j.alreadyProcessed) };
    },
    async houseFund(p) {
      return aPlata(await llamar('house-fund', { ...p, amount: p.amount.toString() }, 1));
    },
    async houseRefund(p) {
      return aPlata(await llamar('house-refund', { ...p, amount: p.amount.toString() }, 1));
    },
    async houseBalance(currency) {
      const j = await llamar('house-balance', { currency }, 1);
      return { balance: BigInt(j.balance), currency: j.currency };
    },
    async recado(nombre, cuerpo) {
      return llamar(`recados/${nombre}`, cuerpo, 1);
    }
  };
}
