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

# ---------------------------------------------------------------- piezas sueltas
# Se comparten entre personajes para que doce caras no sean doce dibujos sueltos.

SONRISA_SUAVE = u'''
  <path d="M 220 332 C 242 348 272 348 294 332" stroke="#7c2f28" stroke-width="6"
        fill="none" stroke-linecap="round"/>
  <path d="M 228 344 C 246 352 268 352 286 344" stroke="#e0a97a" stroke-width="3"
        fill="none" stroke-linecap="round" opacity="0.35"/>
'''

RISA_GRANDE = u'''
  <path d="M 204 330 C 232 322 282 322 310 330 C 302 372 212 372 204 330 Z" fill="#5c2018"/>
  <path d="M 210 331 C 236 326 278 326 304 331 C 298 343 216 343 210 331 Z" fill="#f6efe2"/>
  <path d="M 226 362 C 244 370 270 370 288 362 C 272 358 242 358 226 362 Z" fill="#c05f52"/>
'''

LINEA_SERIA = u'''
  <path d="M 218 336 C 244 330 270 330 296 336" stroke="#6f2a24" stroke-width="6"
        fill="none" stroke-linecap="round"/>
  <path d="M 224 344 C 246 348 268 348 290 344" stroke="#e0a97a" stroke-width="3"
        fill="none" stroke-linecap="round" opacity="0.28"/>
'''

SONRISA_BAJO_BIGOTE = u'''
  <path d="M 222 344 C 244 356 268 356 290 344" stroke="#6f2a24" stroke-width="5.5"
        fill="none" stroke-linecap="round"/>
'''


def bigote(color):
    return (u'\n  <path d="M 210 318 C 228 306 246 310 256 318 C 266 310 284 306 302 318 '
            u'C 292 336 268 338 256 328 C 244 338 220 336 210 318 Z" fill="%s"/>' % color)


def barba(color):
    return (u'\n  <path d="M 172 286 C 172 356 206 396 256 396 C 306 396 340 356 340 286 '
            u'C 336 330 306 352 256 352 C 206 352 176 330 172 286 Z" fill="%s" opacity="0.95"/>'
            % color)


LENTES_REDONDOS = u'''
  <g fill="none" stroke="#c9a24a" stroke-width="5">
    <circle cx="212" cy="252" r="30"/>
    <circle cx="300" cy="252" r="30"/>
    <path d="M 242 252 L 270 252"/>
    <path d="M 182 246 C 172 240 162 236 152 236"/>
    <path d="M 330 246 C 340 240 350 236 360 236"/>
  </g>
  <circle cx="204" cy="242" r="9" fill="#ffffff" opacity="0.2"/>
'''

LENTES_ALAMBRE = u'''
  <g fill="none" stroke="#8d949a" stroke-width="4">
    <rect x="182" y="234" width="60" height="36" rx="10"/>
    <rect x="270" y="234" width="60" height="36" rx="10"/>
    <path d="M 242 250 L 270 250"/>
    <path d="M 182 244 L 152 238"/>
    <path d="M 330 244 L 360 238"/>
  </g>
  <path d="M 190 240 L 214 240" stroke="#ffffff" stroke-width="4" opacity="0.22"
        stroke-linecap="round"/>
'''

LENTES_OSCUROS = u'''
  <g stroke="#0f0c08" stroke-width="6" stroke-linejoin="round">
    <path d="M 174 232 C 196 224 232 224 244 234 C 246 262 232 280 208 280
             C 186 280 174 262 174 232 Z" fill="#16120c"/>
    <path d="M 338 232 C 316 224 280 224 268 234 C 266 262 280 280 304 280
             C 326 280 338 262 338 232 Z" fill="#16120c"/>
    <path d="M 244 236 L 268 236" fill="none"/>
    <path d="M 174 232 L 150 228" fill="none"/>
    <path d="M 338 232 L 362 228" fill="none"/>
  </g>
  <path d="M 186 240 C 200 232 218 230 232 234" stroke="#8fa0a8" stroke-width="5"
        fill="none" opacity="0.4" stroke-linecap="round"/>
  <path d="M 280 234 C 296 230 314 232 326 240" stroke="#8fa0a8" stroke-width="5"
        fill="none" opacity="0.22" stroke-linecap="round"/>
'''


def argollas(claro, oscuro, r=19, y=292):
    return (u'\n  <circle cx="146" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="6"/>'
            u'\n  <circle cx="366" cy="%d" r="%d" fill="none" stroke="%s" stroke-width="6"/>'
            % (y, r, claro, y, r, oscuro))


PERLAS = u'''
  <circle cx="148" cy="290" r="8" fill="#f2ece0" stroke="#b9a98c" stroke-width="1.5"/>
  <circle cx="364" cy="290" r="8" fill="#cfc6b4" stroke="#8f836c" stroke-width="1.5"/>
'''


def sombrero_paja(copa, ala, cinta):
    return (u'''
  <ellipse cx="256" cy="150" rx="188" ry="40" fill="%s"/>
  <ellipse cx="256" cy="144" rx="188" ry="38" fill="%s"/>
  <path d="M 178 148 C 178 86 210 54 256 54 C 302 54 334 86 334 148
           C 306 138 280 134 256 134 C 232 134 206 138 178 148 Z" fill="%s"/>
  <path d="M 178 148 C 178 86 210 54 256 54 C 226 74 202 108 196 144 C 188 145 182 146 178 148 Z"
        fill="#ffffff" opacity="0.14"/>
  <path d="M 180 140 C 210 128 302 128 332 140 L 330 158 C 300 146 212 146 182 158 Z" fill="%s"/>'''
            % (ala, ala, copa, cinta))


SOMBRERO_ALA = u'''
  <ellipse cx="256" cy="146" rx="192" ry="38" fill="#12100c"/>
  <path d="M 176 144 C 176 78 210 44 256 44 C 302 44 336 78 336 144
           C 308 134 280 130 256 130 C 232 130 204 134 176 144 Z" fill="#1a1712"/>
  <path d="M 176 144 C 176 78 210 44 256 44 C 228 66 202 104 196 140 C 186 141 180 142 176 144 Z"
        fill="#ffffff" opacity="0.08"/>
  <path d="M 178 136 C 208 124 304 124 334 136 L 332 156 C 302 144 210 144 180 156 Z" fill="#c9a24a"/>
  <path d="M 178 136 C 208 124 304 124 334 136 L 333 144 C 303 132 209 132 179 144 Z"
        fill="#f0dda2" opacity="0.6"/>
'''


def panuelo(claro, oscuro, cana='#b8b8be'):
    """Panuelo atado atras, no vincha: baja hasta las orejas y deja ver las canas."""
    return (u'''
  <path d="M 150 254 C 144 170 194 124 256 124 C 318 124 368 170 362 254
           C 354 200 320 172 256 172 C 192 172 158 200 150 254 Z" fill="%s"/>
  <path d="M 152 250 C 150 212 164 188 180 174 C 170 198 163 224 161 252 Z" fill="%s"/>
  <path d="M 360 250 C 362 212 348 188 332 174 C 342 198 349 224 351 252 Z" fill="%s"/>
  <path d="M 148 244 C 142 154 194 108 256 108 C 318 108 370 154 364 244
           C 358 234 352 226 346 220 C 350 176 314 152 256 152
           C 198 152 162 176 166 220 C 160 226 154 234 148 244 Z" fill="%s"/>
  <path d="M 150 236 C 152 166 200 132 256 132 C 226 146 178 172 168 226 Z"
        fill="%s" opacity="0.45"/>
  <path d="M 166 214 C 200 190 312 190 346 214 C 312 202 200 202 166 214 Z"
        fill="%s" opacity="0.55"/>
  <path d="M 336 200 C 372 198 394 222 388 254 C 380 228 362 212 328 210 Z" fill="%s"/>
  <path d="M 344 208 C 368 210 380 224 382 242 C 374 224 360 214 340 212 Z"
        fill="#ffffff" opacity="0.2"/>
  <path d="M 328 196 C 344 194 356 198 364 206 C 350 202 338 200 326 202 Z"
        fill="%s" opacity="0.7"/>'''
            % (cana, cana, cana, claro, oscuro, oscuro, claro, oscuro))


# ---------------------------------------------------------------- los diez que faltan

YUBI = dict(
    piel='#8a5a34', pielClara='#b07c4c', pielOscura='#54331b',
    ropa='#d8b423', ropaClara='#f0d24a',
    bg1='#2f6f52', bg2='#154931', bg3='#071e15',
    rubor='#b04a35',
    boca=RISA_GRANDE,
    ceja_izq='M 184 218 C 198 204 228 204 242 216 C 228 212 198 212 184 224 Z',
    ceja_der='M 272 216 C 286 204 316 204 330 218 C 314 212 286 212 272 224 Z',
    pelo_atras=u'''
  <circle cx="256" cy="72" r="46" fill="url(#pelo)"/>
  <circle cx="238" cy="62" r="20" fill="#3a2617" opacity="0.65"/>
  <path d="M 148 244 C 142 160 194 114 256 114 C 318 114 370 160 364 244
           C 356 190 322 162 256 162 C 190 162 156 190 148 244 Z" fill="url(#pelo)"/>
  <g stroke="#0f0a06" stroke-width="4" opacity="0.55" fill="none">
    <path d="M 176 216 C 190 178 218 158 256 156"/>
    <path d="M 198 200 C 212 174 234 160 256 156"/>
    <path d="M 336 216 C 322 178 294 158 256 156"/>
    <path d="M 314 200 C 300 174 278 160 256 156"/>
  </g>''',
    accesorios=argollas('#f0d24a', '#b8973f', 16, 288),
    cuello_ropa=u'''
  <path d="M 196 392 C 220 448 292 448 316 392 C 292 384 220 384 196 392 Z" fill="#b8971a"/>''',
)

CHELA = dict(
    piel='#c99464', pielClara='#e8b98a', pielOscura='#8a5c34',
    pelo='#8e8e94', peloClaro='#c4c4c8',
    ropa='#4a6b52', ropaClara='#6d8f74',
    bg1='#6b3a5e', bg2='#33172c', bg3='#150a12',
    rubor='#c9603f',
    ojoAlto='11', parpado='240',
    boca=SONRISA_SUAVE,
    ceja_izq='M 188 220 C 200 212 226 212 238 220 C 226 216 200 216 188 224 Z',
    ceja_der='M 274 220 C 286 212 312 212 324 220 C 312 216 286 216 274 224 Z',
    pelo_atras=u'''
  <path d="M 150 250 C 144 168 194 122 256 122 C 318 122 368 168 362 250
           C 354 196 320 170 256 170 C 192 170 158 196 150 250 Z" fill="url(#pelo)"/>''',
    pelo_frente=panuelo('#d8a828', '#a67c14'),
    accesorios=LENTES_REDONDOS,
    cuello_ropa=u'''
  <path d="M 194 396 C 220 440 292 440 318 396 C 292 388 220 388 194 396 Z" fill="#3a5641"/>
  <circle cx="216" cy="452" r="7" fill="#e8d9a8" opacity="0.7"/>
  <circle cx="296" cy="452" r="7" fill="#e8d9a8" opacity="0.7"/>''',
)

CHUO = dict(
    piel='#bd8354', pielClara='#e0a875', pielOscura='#794c2b',
    ropa='#33587e', ropaClara='#4b789f',
    bg1='#2c6b4f', bg2='#14452f', bg3='#071d14',
    boca=SONRISA_LADEADA,
    ceja_izq='M 180 216 C 196 202 230 202 244 216 C 228 210 198 210 180 224 Z',
    ceja_der='M 268 216 C 282 202 316 202 332 216 C 314 210 284 210 268 224 Z',
    pelo_atras=u'''
  <path d="M 152 240 C 148 172 192 132 256 132 C 320 132 372 172 360 240
           C 348 190 316 168 256 168 C 196 168 164 190 152 240 Z" fill="#1f150d"/>
  <path d="M 158 222 C 176 180 210 160 256 158 C 234 170 190 186 172 220 Z"
        fill="#3a2617" opacity="0.6"/>
  <path d="M 150 226 C 147 254 152 282 164 300 C 172 278 173 248 170 226 Z" fill="#241709"/>
  <path d="M 362 226 C 365 254 360 282 348 300 C 340 278 339 248 342 226 Z" fill="#150e08"/>''',
    accesorios=u'''
  <g fill="#2a1c10" opacity="0.32">
    <ellipse cx="256" cy="356" rx="52" ry="26"/>
    <ellipse cx="180" cy="300" rx="18" ry="34"/>
    <ellipse cx="332" cy="300" rx="18" ry="34"/>
  </g>''',
    cuello_ropa=u'''
  <path d="M 202 392 C 224 428 288 428 310 392 C 288 384 224 384 202 392 Z" fill="#25405d"/>
  <path d="M 214 388 L 240 434 L 256 400 L 272 434 L 298 388 Z" fill="#4b789f"/>''',
)

PAULA = dict(
    piel='#7a4a28', pielClara='#a06a40', pielOscura='#472716',
    ropa='#c94a3c', ropaClara='#e46e58',
    bg1='#2a6a72', bg2='#123a40', bg3='#06181b',
    rubor='#a3392e',
    boca=RISA_GRANDE,
    ceja_izq='M 182 214 C 198 200 228 202 242 214 C 228 210 198 210 182 222 Z',
    ceja_der='M 272 214 C 286 202 316 200 332 214 C 314 210 286 210 272 222 Z',
    pelo_atras=u'''
  <circle cx="256" cy="196" r="140" fill="url(#pelo)"/>
  <circle cx="176" cy="140" r="52" fill="#241709"/>
  <circle cx="336" cy="140" r="52" fill="#150e08"/>
  <circle cx="256" cy="76" r="58" fill="#1f150d"/>
  <circle cx="200" cy="106" r="40" fill="#33220f" opacity="0.6"/>
  <path d="M 148 236 C 148 158 194 112 256 112 C 318 112 364 158 364 236
           C 364 296 340 352 302 380 C 284 393 228 393 210 380
           C 172 352 148 296 148 236 Z" fill="url(#piel)"/>
  <path d="M 300 130 C 344 158 364 190 364 236 C 364 296 340 352 302 380
           C 292 387 276 391 258 392 C 300 352 322 280 322 216 C 322 178 314 150 300 130 Z"
        fill="#472716" opacity="0.5" filter="url(#suave)"/>''',
    accesorios=argollas('#f0d24a', '#b8973f', 24, 296),
    cuello_ropa=u'''
  <path d="M 192 394 C 218 446 294 446 320 394 C 294 386 218 386 192 394 Z" fill="#a8382c"/>''',
)

CATIRE = dict(
    piel='#e0b088', pielClara='#f6d3ac', pielOscura='#a8794e',
    ropa='#6f7d4f', ropaClara='#8e9d6a',
    bg1='#2f6f52', bg2='#154931', bg3='#071e15',
    pelo='#9a6a22', peloClaro='#c99a3c',
    iris='#4a6b8a',
    boca=SONRISA_BAJO_BIGOTE,
    ceja_izq='M 186 220 C 198 210 226 210 240 220 C 226 216 200 216 186 226 Z',
    ceja_der='M 272 220 C 286 210 314 210 326 220 C 312 216 286 216 272 226 Z',
    pelo_atras=u'''
  <path d="M 152 234 C 148 164 192 124 256 124 C 320 124 372 164 360 234
           C 344 188 312 164 256 164 C 200 164 168 188 152 234 Z" fill="url(#pelo)"
        stroke="#6b4711" stroke-width="3"/>
  <path d="M 160 210 C 186 168 220 148 262 148 C 232 160 194 178 174 212 Z"
        fill="#d8ae52" opacity="0.8"/>
  <path d="M 152 166 C 200 136 320 138 360 174 C 316 154 200 152 152 166 Z" fill="#c99a3c"/>
  <path d="M 150 232 C 150 258 154 282 164 298 C 172 278 173 252 170 230 Z" fill="#8a5e1c"/>
  <path d="M 362 232 C 362 258 358 282 348 298 C 340 278 339 252 342 230 Z" fill="#6b4711"/>''',
    accesorios=bigote('#8a5e1c'),
    cuello_ropa=u'''
  <path d="M 198 392 C 222 430 290 430 314 392 C 290 384 222 384 198 392 Z" fill="#5a6841"/>
  <path d="M 236 396 L 236 512" stroke="#4c5836" stroke-width="4"/>
  <path d="M 276 396 L 276 512" stroke="#4c5836" stroke-width="4"/>''',
)

JUANA = dict(
    piel='#b07a4e', pielClara='#d6a274', pielOscura='#70472a',
    ropa='#5b3a72', ropaClara='#7c5495',
    bg1='#7a4a1f', bg2='#3a2109', bg3='#170d03',
    rubor='#a3503a',
    ojoAlto='11', parpado='240',
    boca=SONRISA_SUAVE,
    ceja_izq='M 188 220 C 200 212 226 212 238 220 C 226 216 200 216 188 224 Z',
    ceja_der='M 274 220 C 286 212 312 212 324 220 C 312 216 286 216 274 224 Z',
    pelo_atras=u'''
  <circle cx="256" cy="90" r="44" fill="url(#pelo)"/>
  <path d="M 226 66 C 244 56 268 56 286 66" stroke="#b8b0a4" stroke-width="6"
        fill="none" stroke-linecap="round" opacity="0.75"/>
  <path d="M 150 248 C 144 166 194 118 256 118 C 318 118 368 166 362 248
           C 354 194 320 166 256 166 C 192 166 158 194 150 248 Z" fill="url(#pelo)"/>
  <path d="M 158 226 C 178 180 212 158 256 156 C 232 170 190 188 172 224 Z"
        fill="#b8b0a4" opacity="0.5"/>
  <path d="M 300 168 C 322 182 336 206 340 236 C 330 206 316 186 296 174 Z"
        fill="#c9c1b4" opacity="0.45"/>''',
    accesorios=PERLAS,
    cuello_ropa=u'''
  <path d="M 194 394 C 220 442 292 442 318 394 C 292 386 220 386 194 394 Z" fill="#472c5b"/>
  <g stroke="#c9a24a" stroke-width="3" fill="none" opacity="0.8">
    <path d="M 176 448 C 200 466 312 466 336 448"/>
    <path d="M 186 470 C 208 486 304 486 326 470"/>
  </g>''',
)

MUSIU = dict(
    piel='#e6c0a0', pielClara='#f8dcc0', pielOscura='#b08a68',
    pelo='#6b5c48', peloClaro='#93826a',
    ropa='#cfc4ac', ropaClara='#e8dfcb',
    bg1='#2a5a6a', bg2='#123038', bg3='#061418',
    iris='#5a7a6a',
    ojoAlto='11', parpado='240',
    boca=SONRISA_SUAVE,
    ceja_izq='M 188 222 C 200 214 226 214 238 222 C 226 218 200 218 188 226 Z',
    ceja_der='M 274 222 C 286 214 312 214 324 222 C 312 218 286 218 274 226 Z',
    pelo_atras=u'''
  <path d="M 154 232 C 156 172 196 138 256 138 C 316 138 356 172 358 232
           C 340 194 306 178 256 178 C 206 178 172 194 154 232 Z" fill="url(#pelo)"
        stroke="#4e4234" stroke-width="3"/>
  <path d="M 200 172 C 224 158 288 158 312 172 C 286 166 226 166 200 172 Z"
        fill="#a8967e" opacity="0.7"/>
  <path d="M 156 228 C 156 252 160 274 168 288 C 176 270 177 248 174 228 Z" fill="#5c4f3e"/>
  <path d="M 358 228 C 358 252 354 274 346 288 C 338 270 337 248 340 228 Z" fill="#463b2e"/>''',
    accesorios=barba('#7e7060') + LENTES_ALAMBRE,
    cuello_ropa=u'''
  <path d="M 200 392 C 224 432 288 432 312 392 C 288 384 224 384 200 392 Z" fill="#b8ab92"/>
  <path d="M 232 390 L 256 440 L 280 390 Z" fill="#e8dfcb"/>''',
)

PANCHO = dict(
    piel='#7f5230', pielClara='#a5714a', pielOscura='#4a2d17',
    pelo='#e8e2d6', peloClaro='#ffffff',
    ropa='#ddd2b8', ropaClara='#f2e9d4',
    bg1='#6b4a22', bg2='#33200c', bg3='#150c04',
    rubor='#96442f',
    ojoAlto='10', parpado='242',
    boca=SONRISA_BAJO_BIGOTE,
    ceja_izq='M 184 214 C 200 204 228 206 242 216 C 226 210 198 210 184 220 Z',
    ceja_der='M 272 216 C 286 206 314 204 330 214 C 316 210 288 210 272 220 Z',
    pelo_atras=u'''
  <path d="M 152 240 C 150 180 194 146 256 146 C 318 146 366 180 362 240
           C 348 198 314 180 256 180 C 198 180 166 198 152 240 Z" fill="#e8e2d6"/>
  <g stroke="#4a2d17" stroke-width="4" opacity="0.35" fill="none" stroke-linecap="round">
    <path d="M 186 300 C 200 306 214 306 226 300"/>
    <path d="M 286 300 C 298 306 312 306 326 300"/>
    <path d="M 196 322 C 208 328 218 328 228 324"/>
    <path d="M 284 324 C 294 328 304 328 316 322"/>
  </g>''',
    pelo_frente=sombrero_paja('#d8bb7a', '#c4a45e', '#2a2118'),
    accesorios=bigote('#f0ece2'),
    cuello_ropa=u'''
  <path d="M 198 392 C 222 434 290 434 314 392 C 290 384 222 384 198 392 Z" fill="#c2b697"/>
  <path d="M 234 396 L 234 512" stroke="#b0a284" stroke-width="4"/>
  <path d="M 278 396 L 278 512" stroke="#b0a284" stroke-width="4"/>''',
)

ZURDA = dict(
    piel='#c08a5c', pielClara='#e2b184', pielOscura='#7a4e2c',
    ropa='#5c1424', ropaClara='#88283c',
    bg1='#3a2a5c', bg2='#1a1230', bg3='#0a0716',
    rubor='#9c3a4a',
    ojoAlto='11', parpado='240',
    boca=SONRISA_LADEADA,
    ceja_izq='M 182 216 C 198 206 230 208 244 218 C 228 212 198 212 182 222 Z',
    ceja_der='M 270 218 C 284 208 316 206 332 216 C 316 212 286 212 270 222 Z',
    pelo_atras=u'''
  <path d="M 256 58 C 320 58 372 110 372 180 C 372 128 326 96 256 96
           C 186 96 140 128 140 180 C 140 110 192 58 256 58 Z" fill="url(#pelo)"/>
  <path d="M 146 244 C 138 156 192 104 256 104 C 320 104 374 156 366 244
           C 360 178 324 148 256 148 C 188 148 152 178 146 244 Z" fill="url(#pelo)"/>
  <path d="M 366 180 C 396 206 404 258 388 300 C 388 254 378 214 358 190 Z" fill="#150e08"/>
  <path d="M 170 200 C 190 162 220 144 256 142 C 226 156 194 174 178 204 Z"
        fill="#5c4028" opacity="0.55"/>''',
    accesorios=u'''
  <path d="M 214 402 C 236 424 276 424 298 402" stroke="#e6c25c" stroke-width="4"
        fill="none" stroke-linecap="round"/>
  <circle cx="256" cy="418" r="6" fill="#f0dda2"/>''',
    cuello_ropa=u'''
  <path d="M 198 390 C 220 436 292 436 314 390 C 292 382 220 382 198 390 Z" fill="#43101b"/>
  <path d="M 214 386 L 246 452 L 256 404 L 266 452 L 298 386 Z" fill="#88283c"/>''',
)

TIGRE = dict(
    piel='#7a4e2e', pielClara='#a06e46', pielOscura='#452817',
    ropa='#1a1a1c', ropaClara='#2e2e33',
    bg1='#7a1f1f', bg2='#380c0c', bg3='#160404',
    rubor='#8e3020',
    ojoAlto='10', parpado='242',
    boca=LINEA_SERIA,
    ceja_izq='M 180 212 C 198 200 230 202 244 214 C 226 208 196 208 180 218 Z',
    ceja_der='M 270 214 C 284 202 316 200 334 212 C 318 208 288 208 270 218 Z',
    pelo_atras=u'''
  <path d="M 156 226 C 158 166 200 132 256 132 C 312 132 354 166 356 226
           C 340 186 308 168 256 168 C 204 168 172 186 156 226 Z" fill="#3a2a20" opacity="0.5"/>''',
    pelo_frente=SOMBRERO_ALA,
    accesorios=barba('#151210') + LENTES_OSCUROS + u'''
  <path d="M 196 342 C 216 350 240 352 256 352 C 272 352 296 350 316 342
           C 300 360 276 368 256 368 C 236 368 212 360 196 342 Z" fill="#4a4340" opacity="0.55"/>''',
    cuello_ropa=u'''
  <path d="M 198 390 C 220 432 292 432 314 390 C 292 382 220 382 198 390 Z" fill="#101012"/>
  <path d="M 214 386 L 244 446 L 256 400 L 268 446 L 298 386 Z" fill="#2e2e33"/>''',
)

RETRATOS = {
    'nano': NANO, 'yubi': YUBI, 'chela': CHELA, 'chuo': CHUO,
    'paula': PAULA, 'catire': CATIRE, 'juana': JUANA, 'musiu': MUSIU,
    'comadre': COMADRE, 'pancho': PANCHO, 'zurda': ZURDA, 'tigre': TIGRE
}

if __name__ == '__main__':
    destino = os.path.join('frontend', 'public', 'avatares')
    os.makedirs(destino, exist_ok=True)
    for nombre, spec in RETRATOS.items():
        ruta = os.path.join(destino, nombre + '.svg')
        io.open(ruta, 'w', encoding='utf-8', newline='\n').write(retrato(**spec))
        print('escrito', ruta)
