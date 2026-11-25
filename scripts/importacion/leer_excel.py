"""Lee la planilla COMERCIALIZADORA DE AZUCAR y devuelve operaciones normalizadas + observaciones."""
import openpyxl, datetime, re, json, sys

HOJAS = {'FACTURADO': ('facturado', '1'), 'MENUDEO': ('menudeo', '2'), 'FACTURADO (Compra - vta)': ('compraventa', 'A')}
UNIR = {'DOG': 'DOG SRL', 'GOLOSINAS': 'GOLOSINAS SA', 'MAXI ABELLA': 'MAXIMILIANO ABELLA',
        'LUCIO JUAREZ CHICO': 'JUAREZ CHICO', 'MIGUEL PEIRETTI (FEDERICO MOLINA)': 'FEDERICO MOLINA',
        'TREBOLAR (MACHADO)': 'TREBOLAR'}
MARCAS = {'santa rosa': 'Santa Rosa', 'santa barbara': 'Santa Bárbara', 'concepcion': 'Concepción',
          'nuñorco': 'Ñuñorco', 'ñuñorco': 'Ñuñorco'}
MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

def num(v):
    if v is None or v == '': return 0.0
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip().replace('$', '').replace(' ', '')
    if not s: return 0.0
    if ',' in s: s = s.replace('.', '').replace(',', '.')
    try: return float(s)
    except ValueError: return None

def nombre(v):
    if v is None: return None
    s = re.sub(r'\s+', ' ', str(v)).strip().upper()
    return UNIR.get(s, s) if s else None

def marca(v):
    if not v: return None
    s = re.sub(r'\s+', ' ', str(v)).strip()
    return MARCAS.get(s.lower(), s[:1].upper() + s[1:]) if s.lower() != 'total' else None

def numero_op(v, prefijo):
    if isinstance(v, datetime.datetime):   # Excel convirtió "1-5" en fecha (día-mes)
        return f'{v.day}-{v.month}'
    return str(v).strip() if v is not None else None

def leer(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ops, obs = [], []
    for hoja, (modalidad, pref) in HOJAS.items():
        ws = wb[hoja]; hdr = None
        for nfila, row in enumerate(ws.iter_rows(values_only=True), start=1):
            vals = list(row)
            txt = [str(x).strip() if x is not None else '' for x in vals]
            if 'VENDEDOR' in txt:
                hdr = {h: i for i, h in enumerate(txt) if h}; continue
            if not hdr: continue
            g = lambda k: vals[hdr[k]] if k in hdr and hdr[k] < len(vals) else None
            if not g('VENDEDOR') and not g('COMPRADOR'): continue
            numero = numero_op(g('OPERACIÓN'), pref)
            extra = [str(x).strip() for i, x in enumerate(vals) if x not in (None, '') and i not in hdr.values()]
            o = dict(hoja=hoja, fila=nfila, modalidad=modalidad, numero=numero,
                     fecha=g('FECHA'), mes=(str(g('MES')).strip() if g('MES') else None),
                     vendedor=nombre(g('VENDEDOR')), comprador=nombre(g('COMPRADOR')), marca=marca(g('MARCA')),
                     bolsas=num(g('CANTIDAD')), zafra=g('ZAFRA'), estado=(str(g('ESTADO')).strip() if g('ESTADO') else None),
                     tipo=(str(g('TIPO DE OPERACIÓN')).strip() if g('TIPO DE OPERACIÓN') else None),
                     compra=num(g('PRECIO COMPRA')), venta=num(g('PRECIO VENTA')),
                     flete=num(g('FLETE')), iibb=num(g('IIBB')), dyc=num(g('DyC')),
                     otros=num(g('OTROS COSTOS') if 'OTROS COSTOS' in hdr else g('Paletizado')), ganancias=num(g('GANANCIAS')),
                     utilidad=num(g('UTILIDAD')), comision=num(g('COMISION')),
                     estado_com=(str(g('ESTADO DE COM')).strip().capitalize() if g('ESTADO DE COM') else None),
                     facturar=g('Monto a Facturar'), extra=extra)
            ops.append(o)
    return ops

if __name__ == '__main__':
    ops = leer(sys.argv[1])
    for o in ops:
        o2 = {k: (v.isoformat()[:10] if isinstance(v, datetime.datetime) else v) for k, v in o.items()}
        print(json.dumps(o2, ensure_ascii=False))
