import { Link } from 'react-router-dom';
import Tile from './Tile.jsx';
import PuntosQueVuelan from './PuntosQueVuelan.jsx';
import { Cartel } from './CelebracionDeRonda.jsx';

/**
 * EL CARTEL DE FIN DE RONDA Y DE FIN DE PARTIDA.
 *
 * Copiado del cartel de fin de mano de privoytruco.com (RoundEndCard y
 * VictoryCeremony): fondo negro verdoso, borde de oro con halo, Cinzel
 * espaciado en los rotulos. Los valores son los mismos, no una imitacion, para
 * que el domino y el truco se vean de la misma casa.
 *
 * Tres bloques, tres preguntas, en orden:
 *   1. quien gano y por que   -> con nombres, nunca "el equipo 2"
 *   2. con que fichas         -> las manos que quedaron y sus puntos
 *   3. como va la partida     -> las plaquetas, el que va ganando en oro
 *
 * Regla de color (la del club): VERDE es lo que ganaste TU. ORO es quien va
 * ganando la partida y el marco. CREMA es lo de ellos: se informa, no se
 * castiga.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const FONDO = 'linear-gradient(175deg, #10231B 0%, #080d0a 100%)';
const ORO = '#C5A028';
const ORO_GRADIENTE = 'linear-gradient(180deg, #F4E2A8 0%, #C5A028 58%, #9A7B1C 100%)';
const TINTA = '#F5F0E8';
const VERDE = '#4CD98B';
const SALVIA = '#A9C7B4';

function juntar(nombres) {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

function recortar(nombre, maximo = 11) {
  const texto = String(nombre ?? '');
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

/* Los rotulos van en Inter y no en Cinzel: en Cinzel el 1 parece una I
   romana y "RONDA 1" se leia "RONDA I". */
function Rotulo({ children, style }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: SALVIA,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function Plaqueta({ etiqueta, puntos, delta, lider }) {
  return (
    <div
      className="flex-1 rounded-[14px] text-center"
      style={{
        maxWidth: 124,
        padding: '8px 6px 9px',
        ...(lider
          ? { background: ORO_GRADIENTE, color: '#10231B', boxShadow: '0 6px 20px rgba(197,160,40,0.4)' }
          : {
              background: 'rgba(245,240,232,0.06)',
              color: 'rgba(245,240,232,0.78)',
              border: '1px solid rgba(245,240,232,0.14)'
            })
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase'
        }}
      >
        {etiqueta}
      </div>
      <div className="tabular-nums" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05 }}>
        {puntos}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', minHeight: 14, opacity: 0.85 }}>
        {delta > 0 ? `+${delta}` : ' '}
      </div>
    </div>
  );
}

function BotonDeOro({ children, onClick, to }) {
  const estilo = {
    background: ORO_GRADIENTE,
    color: '#10231B',
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: '0.02em',
    boxShadow: '0 6px 18px rgba(197,160,40,0.35)'
  };
  const clase = 'block w-full rounded-xl py-3.5 text-center min-h-[48px]';
  if (to) {
    return (
      <Link to={to} className={clase} style={estilo}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clase} style={estilo}>
      {children}
    </button>
  );
}

function BotonSobrio({ children, onClick, to }) {
  const estilo = {
    color: TINTA,
    fontWeight: 700,
    fontSize: 15,
    border: '1px solid rgba(197,160,40,0.45)',
    background: 'rgba(0,0,0,0.25)'
  };
  const clase = 'block w-full rounded-xl py-3 text-center min-h-[46px]';
  if (to) {
    return (
      <Link to={to} className={clase} style={estilo}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clase} style={estilo}>
      {children}
    </button>
  );
}

/**
 * Como se cuenta el cierre, con nombres.
 *
 * Devuelve el titulo grande, la linea de quien gano y la del porque. Todo
 * depende de si es 1 contra 1 o en parejas, y de si el que mira gano.
 */
export function palabrasDelCierre({ players = [], revealedHands, miEquipo, winningTeam, endReason, forfeitedSeat }) {
  const enParejas = players.length === 4;
  const gane = winningTeam != null && winningTeam !== 0 && winningTeam === miEquipo;
  const nombresDe = (equipo) => players.filter((p) => p.team === equipo).map((p) => p.username);
  const rivalEquipo = miEquipo === 1 ? 2 : 1;
  const rivales = nombresDe(rivalEquipo);

  let titulo = '¡Dominó!';
  if (endReason === 'blocked') titulo = '¡Tranca!';
  if (endReason === 'forfeit') titulo = 'Ronda cerrada';
  if (!winningTeam) titulo = 'Empate';

  let quien = '';
  if (endReason === 'forfeit') {
    quien = `${players[forfeitedSeat]?.username ?? 'Alguien'} dejó la partida`;
  } else if (!winningTeam) {
    quien = 'Nadie suma: empate de puntos';
  } else if (enParejas) {
    quien = gane ? 'Ganamos' : `Ganaron ${juntar(rivales)}`;
  } else {
    quien = gane ? 'Ganaste' : `Ganó ${rivales[0] ?? 'el rival'}`;
  }

  let porque = '';
  if (endReason === 'domino' && revealedHands) {
    const dominó = revealedHands.find((m) => m.tiles.length === 0);
    const esMio = dominó && players.find((p) => p.id === dominó.id)?.team === miEquipo && !enParejas;
    porque = esMio ? 'Te quedaste sin fichas' : dominó ? `${dominó.username} se quedó sin fichas` : '';
  } else if (endReason === 'blocked' && winningTeam) {
    porque = gane
      ? enParejas ? 'Se trancó y teníamos menos puntos' : 'Se trancó y tenías menos puntos'
      : `Se trancó y ${enParejas ? 'ellos tenían' : `${rivales[0] ?? 'el rival'} tenía`} menos puntos`;
  } else if (endReason === 'blocked') {
    porque = 'Se trancó el juego';
  }

  return { titulo, quien, porque, gane, enParejas, rivales };
}

export default function CartelDeRonda({
  modo = 'ronda',
  panelRef,
  players = [],
  revealedHands,
  miEquipo,
  winningTeam,
  endReason,
  forfeitedSeat,
  roundPoints = 0,
  puntosQueSuben = 0,
  teamScores = {},
  targetPoints = 100,
  round,
  cambioDeRanking,
  onNext,
  onExit,
  onRevancha = null,
  onReportar = null,
  inicio = '/dashboard'
}) {
  const { titulo, quien, porque, gane, enParejas, rivales } = palabrasDelCierre({
    players, revealedHands, miEquipo, winningTeam, endReason, forfeitedSeat
  });
  const rivalEquipo = miEquipo === 1 ? 2 : 1;
  const mios = teamScores?.[miEquipo] ?? 0;
  const suyos = teamScores?.[rivalEquipo] ?? 0;
  const etiquetaMia = enParejas ? 'Nosotros' : 'Tú';
  const etiquetaSuya = enParejas ? 'Ellos' : recortar(rivales[0] ?? 'Rival');
  const faltan = Math.max(0, targetPoints - Math.max(mios, suyos));
  const abandono = endReason === 'forfeit';
  const colorDelGane = gane ? VERDE : TINTA;

  const manos = revealedHands ?? [];
  const quienesSuman = manos.filter((m) => winningTeam && m.team !== winningTeam);
  const totalQueSuma = quienesSuman.reduce((acc, m) => acc + m.pips, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="relative flex w-full max-w-xs flex-col overflow-hidden rounded-[20px] text-center"
        style={{
          background: FONDO,
          color: TINTA,
          border: '1.5px solid rgba(197,160,40,0.8)',
          boxShadow:
            'inset 0 0 0 1px rgba(244,226,168,0.10), 0 0 50px rgba(197,160,40,0.22), 0 22px 55px rgba(0,0,0,0.65)',
          maxHeight: 'calc(100svh - 32px)'
        }}
      >
        {modo === 'ronda' && !abandono && (
          <PuntosQueVuelan contenedor={panelRef} activo />
        )}

        <div className="px-4 pt-4" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
          {modo === 'ronda' ? (
            <>
              <Rotulo style={{ marginBottom: 6 }}>Ronda {round} · a {targetPoints}</Rotulo>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 26,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '0.04em',
                  background: ORO_GRADIENTE,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))'
                }}
              >
                {titulo}
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: colorDelGane, marginTop: 4 }}>{quien}</div>
              {porque && (
                <div style={{ fontSize: 14, fontWeight: 600, color: SALVIA, marginTop: 2 }}>{porque}</div>
              )}

              {!abandono && (
                <>
                  <div style={{ marginTop: 12 }}>
                    <div
                      data-total-puntos=""
                      className="tabular-nums"
                      style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: colorDelGane }}
                    >
                      +{puntosQueSuben}
                    </div>
                    <Rotulo style={{ marginTop: 4 }}>
                      {winningTeam
                        ? `puntos para ${gane ? (enParejas ? 'nosotros' : 'ti') : enParejas ? 'ellos' : rivales[0] ?? 'el rival'}`
                        : 'nadie suma'}
                    </Rotulo>
                  </div>

                  {manos.length > 0 && (
                    <div
                      className="mt-4 rounded-xl p-3 text-left"
                      style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(244,226,168,0.12)' }}
                    >
                      <Rotulo style={{ marginBottom: 8 }}>Fichas que quedaron</Rotulo>
                      <div className="space-y-2.5">
                        {manos.map((m) => {
                          const ganador = Boolean(winningTeam) && m.team === winningTeam;
                          const esMio = m.team === miEquipo;
                          return (
                            <div key={m.id}>
                              <div className="mb-1 flex items-baseline justify-between" style={{ fontSize: 13 }}>
                                <span style={{ fontWeight: 700, color: esMio && gane ? VERDE : TINTA }}>
                                  {m.username}
                                  {ganador && (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontFamily: SERIF,
                                        fontSize: 9,
                                        letterSpacing: '0.16em',
                                        color: ORO,
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      ganó
                                    </span>
                                  )}
                                </span>
                                <span
                                  data-pips-volando={ganador ? undefined : ''}
                                  className="tabular-nums"
                                  style={{ fontWeight: 800, color: ganador ? SALVIA : ORO }}
                                >
                                  {m.pips} puntos
                                </span>
                              </div>
                              {m.tiles.length === 0 ? (
                                <div style={{ fontSize: 12, fontStyle: 'italic', color: SALVIA }}>se quedó sin fichas</div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {m.tiles.map((t, i) => (
                                    <Tile key={`${m.id}-${i}`} tile={t} orientation="vertical" ancho={30} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div
                        className="mt-3 pt-2 tabular-nums"
                        style={{ borderTop: '1px solid rgba(244,226,168,0.12)', fontSize: 12, fontWeight: 600, color: SALVIA }}
                      >
                        {winningTeam ? (
                          <>
                            {quienesSuman.map((m) => m.pips).join(' + ')} ={' '}
                            <b style={{ color: ORO }}>{totalQueSuma}</b>
                            {totalQueSuma !== roundPoints && (
                              <span style={{ marginLeft: 8, color: '#F0A080' }}>
                                (el servidor dio {roundPoints}; avisa si no cuadra)
                              </span>
                            )}
                          </>
                        ) : (
                          'Empate de puntos: no suma nadie.'
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-4 mb-1">
                <Rotulo style={{ marginBottom: 7 }}>Cómo va la partida</Rotulo>
                <div className="flex justify-center gap-2">
                  <Plaqueta
                    etiqueta={etiquetaMia}
                    puntos={mios}
                    delta={gane ? roundPoints : 0}
                    lider={mios > suyos}
                  />
                  <Plaqueta
                    etiqueta={etiquetaSuya}
                    puntos={suyos}
                    delta={!gane && winningTeam ? roundPoints : 0}
                    lider={suyos > mios}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: SALVIA, marginTop: 8 }}>
                  {faltan > 0 ? `Faltan ${faltan} para ${targetPoints}` : 'Se llegó a la meta'}
                </div>
              </div>
            </>
          ) : (
            <>
              {gane ? (
                <Cartel arte="ganaste" texto="¡Ganaste la partida!" gane className="mb-2 w-[min(70vw,280px)]" />
              ) : (
                <>
                  <Rotulo style={{ marginBottom: 6 }}>Fin de la partida</Rotulo>
                  <div
                    style={{
                      fontFamily: SERIF,
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: TINTA
                    }}
                  >
                    {enParejas ? `Ganaron ${juntar(rivales)}` : `Ganó ${rivales[0] ?? 'el rival'}`}
                  </div>
                </>
              )}
              <div className="mt-3 flex justify-center gap-2">
                <Plaqueta etiqueta={etiquetaMia} puntos={mios} delta={0} lider={mios > suyos} />
                <Plaqueta etiqueta={etiquetaSuya} puntos={suyos} delta={0} lider={suyos > mios} />
              </div>

              {cambioDeRanking && (
                <div
                  className="mt-4 rounded-xl p-3"
                  style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(244,226,168,0.12)' }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 30, fontWeight: 900, color: cambioDeRanking.cambio > 0 ? VERDE : '#F0A080' }}
                    >
                      {cambioDeRanking.cambio > 0 ? '+' : ''}
                      {cambioDeRanking.cambio}
                    </span>
                    <div className="text-left">
                      <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 800 }}>
                        {cambioDeRanking.despues}
                      </div>
                      <Rotulo>puntos</Rotulo>
                    </div>
                  </div>
                  {cambioDeRanking.puesto && (
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: SALVIA }}>
                      Quedaste <b style={{ color: ORO }}>#{cambioDeRanking.puesto}</b> en la clasificación
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-2 px-4 pb-4 pt-4">
          {modo === 'ronda' ? (
            <>
              {winningTeam !== 0 && <BotonDeOro onClick={onNext}>Siguiente ronda</BotonDeOro>}
              <BotonSobrio onClick={onExit}>Salir de la partida</BotonSobrio>
            </>
          ) : (
            <>
              {onRevancha ? (
                <>
                  <BotonDeOro onClick={onRevancha}>Revancha</BotonDeOro>
                  <BotonSobrio to={inicio}>Otra mesa</BotonSobrio>
                  {/* REPORTAR LA PARTIDA (seccion 202, Raul escogio la 1): un
                      renglon, no un boton gordo. El que gano ni lo mira; al que
                      le pasó algo raro lo encuentra donde todavia duele. */}
                  {onReportar && (
                    <button
                      type="button"
                      onClick={onReportar}
                      data-reportar
                      className="mx-auto mt-1 block text-[13px] font-extrabold text-[#F0A090] underline underline-offset-4"
                    >
                      ¿Pasó algo raro? Repórtalo
                    </button>
                  )}
                </>
              ) : (
                <>
                  <BotonDeOro to={inicio}>Volver al inicio</BotonDeOro>
                  <BotonSobrio to="/ranking">Ver la clasificación</BotonSobrio>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
