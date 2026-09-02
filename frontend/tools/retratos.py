# -*- coding: utf-8 -*-
"""
Retratos de los rivales, dibujados a mano en vector.

La base (fondo, cabeza, cuello, hombros, luz) es comun a los doce, para que se
vean del mismo juego. Lo propio de cada uno son pelo, ropa y accesorios.
"""
import io
import os

BASE = u'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
  <radialGradient id="fondo" cx="50%%" cy="34%%" r="78%%">
    <stop offset="0%%" stop-color="%(bg1)s"/>
    <stop offset="58%%" stop-color="%(bg2)s"/>
    <stop offset="100%%" stop-color="%(bg3)s"/>
  </radialGradient>
  <linearGradient id="piel" x1="0.18" y1="0" x2="0.9" y2="1">
    <stop offset="0%%" stop-color="%(pielClara)s"/>
    <stop offset="46%%" stop-color="%(piel)s"/>
    <stop offset="100%%" stop-color="%(pielOscura)s"/>
  </linearGradient>
  <linearGradient id="ropa" x1="0.2" y1="0" x2="0.85" y2="1">
    <stop offset="0%%" stop-color="%(ropaClara)s"/>
    <stop offset="100%%" stop-color="%(ropa)s"/>
  </linearGradient>
  <linearGradient id="pelo" x1="0.25" y1="0" x2="0.85" y2="1">
    <stop offset="0%%" stop-color="%(peloClaro)s"/>
    <stop offset="100%%" stop-color="%(pelo)s"/>
  </linearGradient>
  <radialGradient id="rubor" cx="50%%" cy="50%%" r="50%%">
    <stop offset="0%%" stop-color="%(rubor)s" stop-opacity="0.42"/>
    <stop offset="100%%" stop-color="%(rubor)s" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="borde" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%%" stop-color="#f2dfa8"/>
    <stop offset="50%%" stop-color="#b9922f"/>
    <stop offset="100%%" stop-color="#f2dfa8"/>
  </linearGradient>
  <clipPath id="marco"><circle cx="256" cy="256" r="248"/></clipPath>
  <filter id="suave" x="-30%%" y="-30%%" width="160%%" height="160%%">
    <feGaussianBlur stdDeviation="9"/>
  </filter>
  <filter id="muysuave" x="-40%%" y="-40%%" width="180%%" height="180%%">
    <feGaussianBlur stdDeviation="22"/>
  </filter>
</defs>

<g clip-path="url(#marco)">
  <rect width="512" height="512" fill="url(#fondo)"/>
  <ellipse cx="150" cy="60" rx="230" ry="180" fill="#ffe9b8" opacity="0.13" filter="url(#muysuave)"/>

  <path d="M 40 512 C 48 424 130 386 256 386 C 382 386 464 424 472 512 Z" fill="url(#ropa)"/>
  <path d="M 40 512 C 48 424 130 386 256 386 L 256 512 Z" fill="#ffffff" opacity="0.07"/>
  %(cuello_ropa)s

  <path d="M 214 330 L 214 392 C 214 404 298 404 298 392 L 298 330 Z" fill="%(piel)s"/>
  <path d="M 214 330 L 214 372 C 240 392 272 392 298 372 L 298 330 Z" fill="%(pielOscura)s" opacity="0.55"/>

  <ellipse cx="148" cy="258" rx="16" ry="24" fill="url(#piel)"/>
  <ellipse cx="364" cy="258" rx="16" ry="24" fill="%(pielOscura)s"/>

  <path d="M 148 236 C 148 158 194 112 256 112 C 318 112 364 158 364 236
           C 364 296 340 352 302 380 C 284 393 228 393 210 380
           C 172 352 148 296 148 236 Z" fill="url(#piel)"/>

  <path d="M 300 130 C 344 158 364 190 364 236 C 364 296 340 352 302 380
           C 292 387 276 391 258 392 C 300 352 322 280 322 216 C 322 178 314 150 300 130 Z"
        fill="%(pielOscura)s" opacity="0.5" filter="url(#suave)"/>

  <ellipse cx="198" cy="288" rx="38" ry="26" fill="url(#rubor)"/>
  <ellipse cx="316" cy="288" rx="38" ry="26" fill="url(#rubor)"/>

  %(pelo_atras)s

  <path d="%(ceja_izq)s" fill="%(pelo)s" opacity="0.95"/>
  <path d="%(ceja_der)s" fill="%(pelo)s" opacity="0.95"/>

  <ellipse cx="212" cy="252" rx="21" ry="%(ojoAlto)s" fill="#f6efe4"/>
  <ellipse cx="300" cy="252" rx="21" ry="%(ojoAlto)s" fill="#f6efe4"/>
  <circle cx="%(irisIzqX)s" cy="252" r="9.5" fill="%(iris)s"/>
  <circle cx="%(irisDerX)s" cy="252" r="9.5" fill="%(iris)s"/>
  <circle cx="%(irisIzqX)s" cy="252" r="4.6" fill="#120c07"/>
  <circle cx="%(irisDerX)s" cy="252" r="4.6" fill="#120c07"/>
  <circle cx="%(brilloIzqX)s" cy="247" r="3.1" fill="#ffffff" opacity="0.9"/>
  <circle cx="%(brilloDerX)s" cy="247" r="3.1" fill="#ffffff" opacity="0.9"/>
  <path d="M 191 250 C 200 %(parpado)s 224 %(parpado)s 233 250" stroke="%(pelo)s"
        stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M 279 250 C 288 %(parpado)s 312 %(parpado)s 321 250" stroke="%(pelo)s"
        stroke-width="4.5" fill="none" stroke-linecap="round"/>

  <path d="M 252 262 C 244 288 236 300 244 308 C 252 315 268 315 274 306"
        stroke="%(pielOscura)s" stroke-width="6" fill="none" opacity="0.5" stroke-linecap="round"/>
  <ellipse cx="258" cy="306" rx="19" ry="9" fill="%(pielOscura)s" opacity="0.3" filter="url(#suave)"/>

  %(boca)s
  %(pelo_frente)s
  %(accesorios)s

  <path d="M 148 236 C 148 158 194 112 256 112 C 232 128 190 168 178 236
           C 168 296 182 344 206 378 C 172 350 148 296 148 236 Z"
        fill="#ffe9b8" opacity="0.2" filter="url(#suave)"/>

  <circle cx="256" cy="256" r="248" fill="none" stroke="#000000" stroke-width="70"
          opacity="0.34" filter="url(#suave)"/>
</g>
<circle cx="256" cy="256" r="245" fill="none" stroke="url(#borde)" stroke-width="9" opacity="0.85"/>
</svg>
'''


def retrato(**k):
    d = dict(
        bg1='#2c6b4f', bg2='#14452f', bg3='#071d14',
        piel='#c08050', pielClara='#e0a97a', pielOscura='#7d4d2b',
        pelo='#1b120b', peloClaro='#3a2617',
        ropa='#2b3138', ropaClara='#454e58',
        rubor='#c9603f', iris='#3a2412',
        ojoAlto='13', parpado='236',
        irisIzqX='214', irisDerX='302', brilloIzqX='210', brilloDerX='298',
        ceja_izq='M 186 222 C 198 210 228 210 240 220 C 228 216 198 216 186 228 Z',
        ceja_der='M 272 220 C 284 210 314 210 326 222 C 314 216 284 216 272 228 Z',
        boca='', pelo_atras='', pelo_frente='', accesorios='', cuello_ropa='',
    )
    d.update(k)
    return BASE % d


SONRISA_ABIERTA = u'''
  <path d="M 214 336 C 234 330 278 330 298 336 C 292 366 220 366 214 336 Z" fill="#5c2018"/>
  <path d="M 219 337 C 238 333 274 333 293 337 C 288 346 224 346 219 337 Z" fill="#f4ece0"/>
  <path d="M 214 336 C 234 330 278 330 298 336" stroke="#8a3a2a" stroke-width="3"
        fill="none" stroke-linecap="round"/>
'''

SONRISA_LADEADA = u'''
  <path d="M 218 334 C 240 344 274 344 302 326" stroke="#6f2a24" stroke-width="6"
        fill="none" stroke-linecap="round"/>
  <path d="M 224 340 C 244 352 272 350 294 334 C 274 348 244 350 224 340 Z"
        fill="#b8654e" opacity="0.6"/>
  <path d="M 232 352 C 250 358 268 356 282 348" stroke="#e0a97a" stroke-width="3.5"
        fill="none" stroke-linecap="round" opacity="0.4"/>
  <ellipse cx="304" cy="326" rx="9" ry="6" fill="#6b4429" opacity="0.35"/>
'''

NANO = dict(
    piel='#b87a4c', pielClara='#dfa273', pielOscura='#75462a',
    ropa='#d8d2c6', ropaClara='#f2eee6',
    bg1='#2f6f52', bg2='#154931', bg3='#071e15',
    boca=SONRISA_ABIERTA,
    ceja_izq='M 184 220 C 196 206 228 206 242 218 C 228 214 198 214 184 226 Z',
    ceja_der='M 270 218 C 284 206 316 206 328 220 C 314 214 284 214 270 226 Z',
    pelo_atras=u'''
  <path d="M 152 244 C 146 176 190 130 256 130 C 322 130 366 176 360 244
           C 352 214 336 196 318 190 C 300 200 212 200 194 190 C 176 196 160 214 152 244 Z"
        fill="url(#pelo)"/>
  <path d="M 150 226 C 147 252 152 278 163 296 C 171 276 172 248 169 226 Z" fill="#241709"/>
  <path d="M 362 226 C 365 252 360 278 349 296 C 341 276 340 248 343 226 Z" fill="#150e08"/>''',
    pelo_frente=u'''
  <g transform="rotate(-7 256 190)">
    <path d="M 150 196 C 150 130 196 92 256 92 C 316 92 362 130 362 196
             C 330 182 300 176 256 176 C 212 176 182 182 150 196 Z" fill="#b3271f"/>
    <path d="M 150 196 C 150 130 196 92 256 92 C 232 108 206 146 200 190
             C 182 190 164 192 150 196 Z" fill="#d8392c"/>
    <path d="M 256 92 C 268 118 274 148 274 176 L 262 176 C 262 146 258 116 250 94 Z"
          fill="#8e1c16" opacity="0.55"/>
    <path d="M 128 196 C 150 184 200 178 256 178 C 268 178 274 190 268 196
             C 214 196 164 202 138 212 C 128 212 122 202 128 196 Z" fill="#8e1c16"/>
    <circle cx="256" cy="96" r="8" fill="#d8392c" stroke="#7d1712" stroke-width="2"/>
  </g>''',
    cuello_ropa=u'''
  <path d="M 200 400 C 224 424 288 424 312 400 C 302 392 210 392 200 400 Z" fill="#b9b3a6"/>''',
)

COMADRE = dict(
    piel='#a9764f', pielClara='#cf9b6d', pielOscura='#6b4429',
    ropa='#7d1e57', ropaClara='#a83573',
    bg1='#2b6b7a', bg2='#123a45', bg3='#06181d',
    rubor='#a33f52',
    ojoAlto='11', parpado='240',
    irisIzqX='218', irisDerX='306', brilloIzqX='214', brilloDerX='302',
    boca=SONRISA_LADEADA,
    ceja_izq='M 184 216 C 200 202 230 204 242 216 C 228 210 200 210 184 222 Z',
    ceja_der='M 272 216 C 284 204 314 202 330 216 C 314 210 286 210 272 222 Z',
    pelo_atras=u'''
  <circle cx="256" cy="96" r="42" fill="url(#pelo)"/>
  <circle cx="242" cy="86" r="18" fill="#2c1d12" opacity="0.7"/>
  <path d="M 150 246 C 144 168 192 120 256 120 C 320 120 368 168 362 246
           C 356 200 330 168 256 168 C 182 168 156 200 150 246 Z" fill="url(#pelo)"/>
  <path d="M 160 224 C 180 176 214 158 256 158 C 244 168 206 182 186 220 Z"
        fill="#4a3220" opacity="0.75"/>''',
    pelo_frente=u'''
  <path d="M 150 246 C 152 196 178 166 210 156 C 190 178 178 206 176 240
           C 168 240 158 242 150 246 Z" fill="#120c07"/>''',
    accesorios=u'''
  <circle cx="146" cy="292" r="19" fill="none" stroke="#e6c25c" stroke-width="6"/>
  <circle cx="366" cy="292" r="19" fill="none" stroke="#b8973f" stroke-width="6"/>
  <g fill="none" stroke="#2a1a10" stroke-width="6" stroke-linejoin="round">
    <path d="M 178 244 C 178 228 196 222 216 224 C 234 226 240 236 238 250
             C 236 266 220 274 202 272 C 186 270 178 260 178 244 Z"/>
    <path d="M 274 250 C 272 236 278 226 296 224 C 316 222 334 228 334 244
             C 334 260 326 270 310 272 C 292 274 276 266 274 250 Z"/>
    <path d="M 238 244 L 274 244"/>
    <path d="M 178 240 C 170 232 164 228 156 226"/>
    <path d="M 334 240 C 342 232 348 228 356 226"/>
  </g>
  <path d="M 186 232 C 196 226 212 226 226 230" stroke="#ffffff" stroke-width="4"
        fill="none" opacity="0.28" stroke-linecap="round"/>
  <path d="M 284 230 C 298 226 314 226 324 232" stroke="#ffffff" stroke-width="4"
        fill="none" opacity="0.18" stroke-linecap="round"/>''',
    cuello_ropa=u'''
  <path d="M 190 398 C 220 438 292 438 322 398 C 300 388 212 388 190 398 Z" fill="#5e1441"/>
  <circle cx="256" cy="430" r="9" fill="#e6c25c"/>''',
)

RETRATOS = {'nano': NANO, 'comadre': COMADRE}

if __name__ == '__main__':
    destino = os.path.join('frontend', 'public', 'avatares')
    os.makedirs(destino, exist_ok=True)
    for nombre, spec in RETRATOS.items():
        ruta = os.path.join(destino, nombre + '.svg')
        io.open(ruta, 'w', encoding='utf-8', newline='\n').write(retrato(**spec))
        print('escrito', ruta)
