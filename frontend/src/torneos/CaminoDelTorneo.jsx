import { useMemo } from 'react';
import { BODY } from './utileria.jsx';

/**
 * TU CAMINO EN EL TORNEO, copia del truco (`CaminoDelTorneo.tsx`, opcion C de
 * Raul, 6-ago). Un cuadro de 16 en un telefono no contesta lo que uno pregunta
 * —a quien le toco ahora y quien me espera si gano—: eso es una columna de
 * cuatro pasos. Arriba, las mechas: una por jugador, que se van apagando.
 */

const BRONCE = '#C9A46A';
const BRONCE_TENUE = 'rgba(201,164,106,0.7)';
const TIZA = '#DCE6DC';
const TIZA_SUAVE = 'rgba(220,230,220,0.6)';
const MAX_MECHAS = 32;

/** ¿La llave tiene ronda previa? Sin previa, la ronda 1 tiene el doble de cruces que la 2. */
export function hayPrevia(bracket) {
  let r1 = 0;
  let r2 = 0;
  for (const m of bracket) {
    if (m.round === 1) r1++;
    else if (m.round === 2 && !m.tercerPuesto) r2++;
  }
  return r2 > 0 && r1 > 0 && r1 !== r2 * 2;
}

/** La ronda contada desde el final: «semifinal» dice algo, «ronda 3» no. */
export function nombreDeRonda(round, ultima, conPrevia = false) {
  if (conPrevia && round === 1) return 'La previa';
  const faltan = ultima - round;
  if (ultima <= 1 || faltan === 0) return 'La final';
  if (faltan === 1) return 'Semifinal';
  if (faltan === 2) return 'Cuartos';
  return `Ronda ${conPrevia ? round - 1 : round}`;
}

const participa = (m, id) => m.playerAUserId === id || m.playerBUserId === id;
const rivalDe = (m, id) => (m.playerAUserId === id ? m.playerBUserId : m.playerBUserId === id ? m.playerAUserId : null);

/** Funcion PURA: el camino del jugador sacado de la llave. */
export function derivarCamino(detail, userId) {
  const nombres = new Map(detail.players.map((p) => [p.userId, p.displayName]));
  const nombreDe = (id) => (id ? nombres.get(id) ?? 'Un rival' : '—');
  const bracket = detail.bracket;
  const ultima = bracket.reduce((max, m) => Math.max(max, m.round), 1);
  const conPrevia = hayPrevia(bracket);

  const eliminados = new Set();
  for (const m of bracket) {
    if (m.status !== 'completed' || !m.winnerUserId) continue;
    for (const id of [m.playerAUserId, m.playerBUserId]) if (id && id !== m.winnerUserId) eliminados.add(id);
  }
  const todos = detail.players.filter((p) => p.status !== 'refunded');
  const dePie = todos.filter((p) => !eliminados.has(p.userId)).length;
  const mios = bracket.filter((m) => participa(m, userId)).sort((a, b) => a.round - b.round);

  if (bracket.length === 0 || mios.length === 0) return { pasos: [], dePie, total: todos.length, resto: [] };

  const pasos = [];
  for (const m of mios) {
    const rival = rivalDe(m, userId);
    const gane = m.winnerUserId === userId;
    const cerrado = m.status === 'completed' || m.status === 'bye';
    const estado = cerrado ? (gane ? 'ganado' : 'perdido') : 'ahora';
    let nota;
    if (m.status === 'bye' || (cerrado && gane && !rival)) nota = 'pasaste sin jugar';
    else if (cerrado && m.finalScores?.length >= 2) {
      const [a, b] = m.finalScores;
      const mio = m.playerAUserId === userId ? a : b;
      const suyo = m.playerAUserId === userId ? b : a;
      nota = gane ? `le ganaste ${mio}–${suyo}` : `te ganó ${suyo}–${mio}`;
    } else if (cerrado) nota = gane ? 'la ganaste' : 'quedaste fuera';
    else if (m.status === 'playing') nota = 'jugando';
    else nota = rival ? 'lo estás esperando' : 'esperando a que salga tu rival';
    const peleaElTercero = cerrado && !gane && bracket.some((x) => x.tercerPuesto && participa(x, userId));
    pasos.push({
      round: m.round,
      titulo: m.tercerPuesto ? 'Por el 3.er puesto' : nombreDeRonda(m.round, ultima, conPrevia),
      quien: rival ? nombreDe(rival) : 'sale de la otra mesa',
      estado,
      nota: peleaElTercero && nota === 'quedaste fuera' ? 'vas por el tercer puesto' : nota
    });
  }

  const ultimoMio = mios[mios.length - 1];
  const sigoVivo = !ultimoMio || ultimoMio.status !== 'completed' || ultimoMio.winnerUserId === userId;
  const voyPorElTercero = mios.some((m) => m.tercerPuesto);
  if (sigoVivo && !voyPorElTercero) {
    const desde = ultimoMio ? ultimoMio.round + 1 : 1;
    for (let r = desde; r <= ultima; r++) {
      const candidatos = r === desde && ultimoMio?.nextMatchId ? bracket.find((m) => m.id === ultimoMio.nextMatchId) : undefined;
      const a = candidatos?.playerAUserId ?? null;
      const b = candidatos?.playerBUserId ?? null;
      const otro = a === userId ? b : b === userId ? a : null;
      pasos.push({
        round: r,
        titulo: nombreDeRonda(r, ultima, conPrevia),
        quien: otro != null ? nombreDe(otro) : r === ultima ? 'la última mesa prendida' : 'el que salga de la otra mesa',
        estado: 'porVenir',
        nota: null
      });
    }
  }

  const rondaEnCurso = ultimoMio?.round ?? 1;
  const resto = bracket
    .filter((m) => m.round === rondaEnCurso && !participa(m, userId) && !m.tercerPuesto)
    .slice(0, 3)
    .map((m) => {
      const walkover = m.status === 'bye' || (m.status === 'completed' && (!m.playerAUserId || !m.playerBUserId || !m.finalScores));
      const estado = walkover ? 'pasó sin jugar' : m.status === 'playing' ? 'jugando' : m.status === 'completed' && m.finalScores?.length ? `${m.finalScores[0]}–${m.finalScores[1]}` : 'por empezar';
      const lado = (id) => (id ? nombreDe(id) : 'por definir');
      return { titulo: `${lado(m.playerAUserId)} – ${lado(m.playerBUserId)}`, estado, walkover };
    });

  return { pasos, dePie, total: todos.length, resto };
}

export default function CaminoDelTorneo({ detail, userId }) {
  const camino = useMemo(() => derivarCamino(detail, userId), [detail, userId]);
  if (camino.pasos.length === 0) return null;

  return (
    <div className="w-full" data-testid="tu-camino">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2" style={{ fontFamily: BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRONCE, textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>
        <span>quedan {camino.dePie} de pie</span>
        {camino.total <= MAX_MECHAS && (
          <span className="flex gap-[3px]" aria-hidden>
            {Array.from({ length: camino.total }, (_, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: 9999, background: i < camino.dePie ? BRONCE : 'rgba(201,164,106,0.2)' }} />
            ))}
          </span>
        )}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(201,164,106,0.3)', borderRadius: 10, padding: '12px 12px 6px', backdropFilter: 'blur(2px)' }}>
        <p style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: BRONCE, margin: '0 0 8px' }}>Tu camino</p>
        {camino.pasos.map((p, i) => {
          const ultimo = i === camino.pasos.length - 1;
          const esAhora = p.estado === 'ahora';
          const cerrado = p.estado === 'ganado' || p.estado === 'perdido';
          return (
            <div key={`${p.round}-${i}`} className="flex gap-2.5">
              <div className="flex flex-col items-center pt-[5px]">
                <span style={{ width: 9, height: 9, borderRadius: 9999, flex: 'none', border: `1.5px solid ${esAhora ? BRONCE : TIZA}`, background: cerrado ? TIZA : esAhora ? BRONCE : 'transparent', boxShadow: esAhora ? '0 0 0 3px rgba(201,164,106,0.25)' : undefined }} />
                {!ultimo && <span style={{ width: 1.5, flex: 1, minHeight: 16, background: 'rgba(220,230,220,0.28)', margin: '2px 0' }} />}
              </div>
              <div className="flex min-w-0 flex-col pb-2.5" style={{ gap: 1 }}>
                <span style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: esAhora ? BRONCE : TIZA_SUAVE }}>
                  {p.titulo}{esAhora ? ' · ahora' : ''}
                </span>
                <span style={{ fontFamily: BODY, fontSize: esAhora ? 15 : 13, fontWeight: esAhora ? 800 : 600, color: cerrado ? TIZA_SUAVE : TIZA, textDecoration: p.estado === 'perdido' ? 'line-through' : undefined }}>
                  {p.quien}
                </span>
                {p.nota && <span style={{ fontFamily: BODY, fontSize: 11, fontStyle: 'italic', color: 'rgba(220,230,220,0.62)' }}>{p.nota}</span>}
              </div>
            </div>
          );
        })}

        {camino.resto.length > 0 && (
          <div style={{ borderTop: '1px dashed rgba(201,164,106,0.28)', paddingTop: 7, marginTop: 2, marginBottom: 6 }}>
            <p style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRONCE_TENUE, margin: '0 0 3px' }}>El resto del salón</p>
            {camino.resto.map((r, i) => (
              <div key={i} className="flex justify-between gap-2" style={{ fontFamily: BODY, fontSize: 11.5, color: 'rgba(220,230,220,0.75)', padding: '1px 0' }}>
                <span className="min-w-0 truncate">{r.titulo}</span>
                <span style={{ color: r.walkover ? BRONCE_TENUE : r.estado === 'jugando' ? '#9FE8BC' : 'rgba(220,230,220,0.75)', fontStyle: r.walkover ? 'italic' : undefined, whiteSpace: 'nowrap' }}>{r.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
