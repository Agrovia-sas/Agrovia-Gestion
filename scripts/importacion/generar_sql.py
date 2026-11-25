import json, re, sys
ops=[json.loads(l) for l in open('ops.jsonl')]
OMITIR = {'1-87': 'ya está en el sistema', '2-139': 'ya está en el sistema (era la 2-141)',
          '1-23': 'comisión negativa (-201.000) en la planilla', 'A-3': 'vende AGROVIA SAS (stock propio)', 'A-4': 'vende AGROVIA SAS (stock propio)'}
FECHAS = {'2-1': '2026-01-05', '2-46': '2026-05-02'}
recs, omitidas, notas = [], [], []
for o in ops:
    n = o['numero']
    if n in OMITIR: omitidas.append((n, OMITIR[n])); continue
    bolsas = int(o['bolsas'])
    comprador = None if o['comprador'] in (None, 'AGROVIA', 'AGROVIA SAS') else o['comprador']
    venta = o['venta'] if (o['venta'] and comprador) else None
    costos = o['flete']+o['iibb']+o['dyc']+o['otros']+o['ganancias']
    com = o['comision'] or 0
    obs = []
    if venta is None:
        tipo, valor = 'diferencia', None
    else:
        dif = venta - o['compra'] - costos
        tipo, valor = None, None
        if abs(dif*bolsas - com) < 1: tipo = 'diferencia'
        else:
            for p in (0.5, 1, 1.5, 2, 2.5, 3):
                if abs(venta*p/100*bolsas - com) < 1: tipo, valor = 'porcentaje', p; break
        if tipo is None:
            tipo, valor = 'fija', round(com, 2)
            obs.append(f'Comisión según planilla ({com:,.0f}); el cálculo por diferencia daba {dif*bolsas:,.0f}'.replace(',', '.'))
            notas.append((n, f'fija {com:,.0f} (diferencia daría {dif*bolsas:,.0f})'))
    # cargas
    cargadas = bolsas if o['estado'] == 'Cargadas' else 0
    for t in o['extra']:
        m = re.search(r'[Pp]endiente de carga ([\d\.]+)', t)
        if m: cargadas = bolsas - int(m.group(1).replace('.', ''))
    if o['estado'] != 'Cargadas' and not any('endiente de carga' in t for t in o['extra']):
        notas.append((n, 'figura Pendiente sin cantidad: tomé 0 bolsas cargadas'))
    if o['tipo'] and o['tipo'].upper() == 'SUBFACTURADO': obs.append('Subfacturado')
    if str(o.get('facturar') or '').strip().lower() == 's/factura': obs.append('Sin factura')
    obs += o['extra']
    if o['comprador'] in ('AGROVIA', 'AGROVIA SAS'): obs.append('Compra para stock propio de AGROVIA')
    obs.append(f'Importada de la planilla ({o["hoja"]}, fila {o["fila"]})')
    fecha = FECHAS.get(n, o['fecha'][:10])
    if n in FECHAS: notas.append((n, f'fecha corregida {o["fecha"][:10]} → {fecha} (mes {o["mes"]})'))
    recs.append(dict(numero=n, seq=int(n.split('-')[1]), modalidad=o['modalidad'], fecha=fecha,
        vendedor=o['vendedor'], comprador=comprador, marca=o['marca'], zafra=o['zafra'], bolsas=bolsas,
        compra=o['compra'], venta=venta, flete=o['flete'], iibb=o['iibb'], dyc=o['dyc'], otros=o['otros'], ganancias=o['ganancias'],
        tipo=tipo, valor=valor, cargadas=max(0, min(cargadas, bolsas)), cobrado=(o['estado_com'] == 'Cobrado'),
        com_excel=com, obs=' · '.join(obs)))
json.dump(recs, open('recs.json', 'w'), ensure_ascii=False)
payload = json.dumps(recs, ensure_ascii=False).replace("'", "''")
sql = open('importar_template.sql').read().replace('__PAYLOAD__', payload)
open('importar.sql', 'w').write(sql)
print('a importar', len(recs), '| omitidas', omitidas)
for x in notas: print('  ', x)
