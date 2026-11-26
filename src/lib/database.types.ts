export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      anticipos: {
        Row: {
          anulado: boolean
          concepto: string | null
          created_at: string
          fecha: string
          id: string
          importe: number
          movimiento_id: string
          sentido: string
          tercero_id: string
        }
        Insert: {
          anulado?: boolean
          concepto?: string | null
          created_at?: string
          fecha?: string
          id?: string
          importe: number
          movimiento_id: string
          sentido: string
          tercero_id: string
        }
        Update: {
          anulado?: boolean
          concepto?: string | null
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          movimiento_id?: string
          sentido?: string
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anticipos_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "anticipos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      aplicaciones: {
        Row: {
          anticipo_id: string | null
          anulada: boolean
          anulada_at: string | null
          cheque_id: string | null
          created_at: string
          created_by: string | null
          factura_numero: string | null
          fecha: string
          id: string
          importe: number
          iva_facturado: number
          motivo_anulacion: string | null
          movimiento_id: string | null
          nota: string | null
          obligacion_compensada_id: string | null
          obligacion_id: string
          origen: Database["public"]["Enums"]["origen_aplicacion"]
          retencion_certificado: string | null
          retencion_tipo: string | null
        }
        Insert: {
          anticipo_id?: string | null
          anulada?: boolean
          anulada_at?: string | null
          cheque_id?: string | null
          created_at?: string
          created_by?: string | null
          factura_numero?: string | null
          fecha?: string
          id?: string
          importe: number
          iva_facturado?: number
          motivo_anulacion?: string | null
          movimiento_id?: string | null
          nota?: string | null
          obligacion_compensada_id?: string | null
          obligacion_id: string
          origen: Database["public"]["Enums"]["origen_aplicacion"]
          retencion_certificado?: string | null
          retencion_tipo?: string | null
        }
        Update: {
          anticipo_id?: string | null
          anulada?: boolean
          anulada_at?: string | null
          cheque_id?: string | null
          created_at?: string
          created_by?: string | null
          factura_numero?: string | null
          fecha?: string
          id?: string
          importe?: number
          iva_facturado?: number
          motivo_anulacion?: string | null
          movimiento_id?: string | null
          nota?: string | null
          obligacion_compensada_id?: string | null
          obligacion_id?: string
          origen?: Database["public"]["Enums"]["origen_aplicacion"]
          retencion_certificado?: string | null
          retencion_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aplicaciones_anticipo_id_fkey"
            columns: ["anticipo_id"]
            isOneToOne: false
            referencedRelation: "anticipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "v_cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_obligacion_compensada_id_fkey"
            columns: ["obligacion_compensada_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_obligacion_compensada_id_fkey"
            columns: ["obligacion_compensada_id"]
            isOneToOne: false
            referencedRelation: "v_obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicaciones_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "v_obligaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          fecha: string
          id: number
          registro_id: string | null
          tabla: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          fecha?: string
          id?: never
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          fecha?: string
          id?: never
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: []
      }
      cargas: {
        Row: {
          bolsas: number
          chofer: string | null
          created_at: string
          created_by: string | null
          deposito_id: string | null
          es_apertura: boolean
          fecha: string
          id: string
          ingenio_id: string | null
          observaciones: string | null
          operacion_id: string
          orden_retiro: string | null
          patente: string | null
          remito: string | null
          transportista_id: string | null
          ubicacion_tipo: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Insert: {
          bolsas: number
          chofer?: string | null
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          es_apertura?: boolean
          fecha?: string
          id?: string
          ingenio_id?: string | null
          observaciones?: string | null
          operacion_id: string
          orden_retiro?: string | null
          patente?: string | null
          remito?: string | null
          transportista_id?: string | null
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Update: {
          bolsas?: number
          chofer?: string | null
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          es_apertura?: boolean
          fecha?: string
          id?: string
          ingenio_id?: string | null
          observaciones?: string | null
          operacion_id?: string
          orden_retiro?: string | null
          patente?: string | null
          remito?: string | null
          transportista_id?: string | null
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_ingenio_id_fkey"
            columns: ["ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "cargas_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "cargas_transportista_id_fkey"
            columns: ["transportista_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      cheque_eventos: {
        Row: {
          cheque_id: string
          created_at: string
          estado_anterior: Database["public"]["Enums"]["estado_cheque"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_cheque"]
          fecha: string
          id: number
          nota: string | null
          usuario_id: string | null
        }
        Insert: {
          cheque_id: string
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_cheque"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_cheque"]
          fecha?: string
          id?: never
          nota?: string | null
          usuario_id?: string | null
        }
        Update: {
          cheque_id?: string
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_cheque"] | null
          estado_nuevo?: Database["public"]["Enums"]["estado_cheque"]
          fecha?: string
          id?: never
          nota?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheque_eventos_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_eventos_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "v_cheques"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          banco: string | null
          beneficiario_id: string | null
          created_at: string
          cuenta_id: string | null
          cuit_librador: string | null
          entregado_por_id: string | null
          estado: Database["public"]["Enums"]["estado_cheque"]
          fecha_emision: string | null
          fecha_pago: string
          fecha_recepcion: string | null
          id: string
          importe: number
          librador: string | null
          numero: string
          observaciones: string | null
          operacion_id: string | null
          origen: string
          tipo: string
        }
        Insert: {
          banco?: string | null
          beneficiario_id?: string | null
          created_at?: string
          cuenta_id?: string | null
          cuit_librador?: string | null
          entregado_por_id?: string | null
          estado: Database["public"]["Enums"]["estado_cheque"]
          fecha_emision?: string | null
          fecha_pago: string
          fecha_recepcion?: string | null
          id?: string
          importe: number
          librador?: string | null
          numero: string
          observaciones?: string | null
          operacion_id?: string | null
          origen: string
          tipo?: string
        }
        Update: {
          banco?: string | null
          beneficiario_id?: string | null
          created_at?: string
          cuenta_id?: string | null
          cuit_librador?: string | null
          entregado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_cheque"]
          fecha_emision?: string | null
          fecha_pago?: string
          fecha_recepcion?: string | null
          id?: string
          importe?: number
          librador?: string | null
          numero?: string
          observaciones?: string | null
          operacion_id?: string | null
          origen?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "cheques_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      comision_participantes: {
        Row: {
          comision_id: string
          id: string
          motivo: string | null
          tercero_id: string
          tipo: string
          valor: number
        }
        Insert: {
          comision_id: string
          id?: string
          motivo?: string | null
          tercero_id: string
          tipo: string
          valor: number
        }
        Update: {
          comision_id?: string
          id?: string
          motivo?: string | null
          tercero_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "comision_participantes_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_participantes_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "comision_participantes_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_participantes_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "comision_participantes_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      comisiones: {
        Row: {
          cobro_anticipado: boolean
          cobro_parcial: boolean
          estado: Database["public"]["Enums"]["estado_comision"]
          fecha_cobro: string | null
          fecha_exigible: string | null
          id: string
          importe: number
          importe_cobrado: number
          operacion_id: string
          updated_at: string
        }
        Insert: {
          cobro_anticipado?: boolean
          cobro_parcial?: boolean
          estado?: Database["public"]["Enums"]["estado_comision"]
          fecha_cobro?: string | null
          fecha_exigible?: string | null
          id?: string
          importe?: number
          importe_cobrado?: number
          operacion_id: string
          updated_at?: string
        }
        Update: {
          cobro_anticipado?: boolean
          cobro_parcial?: boolean
          estado?: Database["public"]["Enums"]["estado_comision"]
          fecha_cobro?: string | null
          fecha_exigible?: string | null
          id?: string
          importe?: number
          importe_cobrado?: number
          operacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "comisiones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          alicuota_iva_default: number
          cuit: string | null
          dias_alerta_vencimiento: number
          dias_vencimiento_comision: number
          domicilio: string | null
          id: boolean
          kg_por_bolsa_default: number
          logo_path: string | null
          razon_social: string
          updated_at: string
        }
        Insert: {
          alicuota_iva_default?: number
          cuit?: string | null
          dias_alerta_vencimiento?: number
          dias_vencimiento_comision?: number
          domicilio?: string | null
          id?: boolean
          kg_por_bolsa_default?: number
          logo_path?: string | null
          razon_social?: string
          updated_at?: string
        }
        Update: {
          alicuota_iva_default?: number
          cuit?: string | null
          dias_alerta_vencimiento?: number
          dias_vencimiento_comision?: number
          domicilio?: string | null
          id?: boolean
          kg_por_bolsa_default?: number
          logo_path?: string | null
          razon_social?: string
          updated_at?: string
        }
        Relationships: []
      }
      cuentas_tesoreria: {
        Row: {
          activa: boolean
          banco: string | null
          created_at: string
          fecha_saldo_inicial: string | null
          id: string
          nombre: string
          numero: string | null
          saldo_inicial: number
          tipo: string
        }
        Insert: {
          activa?: boolean
          banco?: string | null
          created_at?: string
          fecha_saldo_inicial?: string | null
          id?: string
          nombre: string
          numero?: string | null
          saldo_inicial?: number
          tipo: string
        }
        Update: {
          activa?: boolean
          banco?: string | null
          created_at?: string
          fecha_saldo_inicial?: string | null
          id?: string
          nombre?: string
          numero?: string | null
          saldo_inicial?: number
          tipo?: string
        }
        Relationships: []
      }
      custodia_movimientos: {
        Row: {
          bolsas: number
          carga_id: string | null
          chofer: string | null
          created_at: string
          created_by: string | null
          desde_deposito_id: string | null
          desde_ingenio_id: string | null
          destinatario_id: string | null
          dueno_id: string
          fecha: string
          hacia_deposito_id: string | null
          hacia_ingenio_id: string | null
          id: string
          importe: number | null
          marca_id: string | null
          observaciones: string | null
          operacion_id: string | null
          patente: string | null
          remito: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_custodia"]
        }
        Insert: {
          bolsas: number
          carga_id?: string | null
          chofer?: string | null
          created_at?: string
          created_by?: string | null
          desde_deposito_id?: string | null
          desde_ingenio_id?: string | null
          destinatario_id?: string | null
          dueno_id: string
          fecha?: string
          hacia_deposito_id?: string | null
          hacia_ingenio_id?: string | null
          id?: string
          importe?: number | null
          marca_id?: string | null
          observaciones?: string | null
          operacion_id?: string | null
          patente?: string | null
          remito?: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_custodia"]
        }
        Update: {
          bolsas?: number
          carga_id?: string | null
          chofer?: string | null
          created_at?: string
          created_by?: string | null
          desde_deposito_id?: string | null
          desde_ingenio_id?: string | null
          destinatario_id?: string | null
          dueno_id?: string
          fecha?: string
          hacia_deposito_id?: string | null
          hacia_ingenio_id?: string | null
          id?: string
          importe?: number | null
          marca_id?: string | null
          observaciones?: string | null
          operacion_id?: string | null
          patente?: string | null
          remito?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mov_custodia"]
        }
        Relationships: [
          {
            foreignKeyName: "custodia_movimientos_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: true
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_desde_deposito_id_fkey"
            columns: ["desde_deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_desde_ingenio_id_fkey"
            columns: ["desde_ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "custodia_movimientos_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "custodia_movimientos_dueno_id_fkey"
            columns: ["dueno_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_dueno_id_fkey"
            columns: ["dueno_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "custodia_movimientos_dueno_id_fkey"
            columns: ["dueno_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "custodia_movimientos_hacia_deposito_id_fkey"
            columns: ["hacia_deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_hacia_ingenio_id_fkey"
            columns: ["hacia_ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodia_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "custodia_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      depositos: {
        Row: {
          activo: boolean
          canero_id: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          canero_id?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          canero_id?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "depositos_canero_id_fkey"
            columns: ["canero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depositos_canero_id_fkey"
            columns: ["canero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "depositos_canero_id_fkey"
            columns: ["canero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      descuentos_cheque: {
        Row: {
          cheque_id: string
          comisiones: number
          costo_total: number
          created_at: string
          cuenta_id: string
          dias: number
          dias_clearing: number
          entidad: string
          fecha: string
          id: string
          interes: number
          iva_comisiones: number
          movimiento_id: string | null
          neto: number
          tasa_mensual: number
        }
        Insert: {
          cheque_id: string
          comisiones?: number
          costo_total: number
          created_at?: string
          cuenta_id: string
          dias: number
          dias_clearing?: number
          entidad: string
          fecha?: string
          id?: string
          interes: number
          iva_comisiones?: number
          movimiento_id?: string | null
          neto: number
          tasa_mensual: number
        }
        Update: {
          cheque_id?: string
          comisiones?: number
          costo_total?: number
          created_at?: string
          cuenta_id?: string
          dias?: number
          dias_clearing?: number
          entidad?: string
          fecha?: string
          id?: string
          interes?: number
          iva_comisiones?: number
          movimiento_id?: string | null
          neto?: number
          tasa_mensual?: number
        }
        Relationships: [
          {
            foreignKeyName: "descuentos_cheque_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: true
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descuentos_cheque_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: true
            referencedRelation: "v_cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descuentos_cheque_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descuentos_cheque_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "descuentos_cheque_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_vinculos: {
        Row: {
          carga_id: string | null
          cheque_id: string | null
          documento_id: string
          id: string
          movimiento_id: string | null
          obligacion_id: string | null
          operacion_id: string | null
          tercero_id: string | null
        }
        Insert: {
          carga_id?: string | null
          cheque_id?: string | null
          documento_id: string
          id?: string
          movimiento_id?: string | null
          obligacion_id?: string | null
          operacion_id?: string | null
          tercero_id?: string | null
        }
        Update: {
          carga_id?: string | null
          cheque_id?: string | null
          documento_id?: string
          id?: string
          movimiento_id?: string | null
          obligacion_id?: string | null
          operacion_id?: string | null
          tercero_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_vinculos_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "v_cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "v_obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "documento_vinculos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vinculos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "documento_vinculos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          nombre: string
          storage_path: string
          subido_por: string | null
          tamano_bytes: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          nombre: string
          storage_path: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          nombre?: string
          storage_path?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tipo?: string
        }
        Relationships: []
      }
      extracto_lineas: {
        Row: {
          concepto: string | null
          created_at: string
          cuenta_id: string
          estado: Database["public"]["Enums"]["estado_linea_extracto"]
          extracto_id: string
          fecha: string
          huella: string
          id: string
          importe: number
          movimiento_id: string | null
          orden: number
          referencia: string | null
          saldo_linea: number | null
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          cuenta_id: string
          estado?: Database["public"]["Enums"]["estado_linea_extracto"]
          extracto_id: string
          fecha: string
          huella: string
          id?: string
          importe: number
          movimiento_id?: string | null
          orden: number
          referencia?: string | null
          saldo_linea?: number | null
        }
        Update: {
          concepto?: string | null
          created_at?: string
          cuenta_id?: string
          estado?: Database["public"]["Enums"]["estado_linea_extracto"]
          extracto_id?: string
          fecha?: string
          huella?: string
          id?: string
          importe?: number
          movimiento_id?: string | null
          orden?: number
          referencia?: string | null
          saldo_linea?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracto_lineas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracto_lineas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "extracto_lineas_extracto_id_fkey"
            columns: ["extracto_id"]
            isOneToOne: false
            referencedRelation: "extractos_importados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracto_lineas_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      extractos_importados: {
        Row: {
          archivo_hash: string
          archivo_nombre: string
          created_at: string
          cuenta_id: string
          id: string
          periodo_desde: string | null
          periodo_hasta: string | null
          saldo_final: number | null
          usuario_id: string | null
        }
        Insert: {
          archivo_hash: string
          archivo_nombre: string
          created_at?: string
          cuenta_id: string
          id?: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          saldo_final?: number | null
          usuario_id?: string | null
        }
        Update: {
          archivo_hash?: string
          archivo_nombre?: string
          created_at?: string
          cuenta_id?: string
          id?: string
          periodo_desde?: string | null
          periodo_hasta?: string | null
          saldo_final?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extractos_importados_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extractos_importados_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria_id: string
          created_at: string
          created_by: string | null
          descripcion: string
          descuento_id: string | null
          fecha: string
          forma: string
          id: string
          importe_neto: number
          iva: number
          movimiento_id: string | null
          numero_factura: string | null
          operacion_id: string | null
          otros_impuestos: number
          proveedor_id: string | null
          total: number | null
        }
        Insert: {
          categoria_id: string
          created_at?: string
          created_by?: string | null
          descripcion: string
          descuento_id?: string | null
          fecha?: string
          forma: string
          id?: string
          importe_neto: number
          iva?: number
          movimiento_id?: string | null
          numero_factura?: string | null
          operacion_id?: string | null
          otros_impuestos?: number
          proveedor_id?: string | null
          total?: number | null
        }
        Update: {
          categoria_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string
          descuento_id?: string | null
          fecha?: string
          forma?: string
          id?: string
          importe_neto?: number
          iva?: number
          movimiento_id?: string | null
          numero_factura?: string | null
          operacion_id?: string | null
          otros_impuestos?: number
          proveedor_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_descuento_id_fkey"
            columns: ["descuento_id"]
            isOneToOne: false
            referencedRelation: "descuentos_cheque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      ingenios: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          cheque_id: string | null
          concepto: string
          created_at: string
          created_by: string | null
          cuenta_id: string
          estado: Database["public"]["Enums"]["estado_movimiento"]
          extracto_linea_id: string | null
          fecha: string
          id: string
          importe: number
          medio: Database["public"]["Enums"]["medio_pago"]
          motivo_reversion: string | null
          operacion_id: string | null
          par_transferencia: string | null
          revierte_a: string | null
          tercero_id: string | null
        }
        Insert: {
          cheque_id?: string | null
          concepto: string
          created_at?: string
          created_by?: string | null
          cuenta_id: string
          estado?: Database["public"]["Enums"]["estado_movimiento"]
          extracto_linea_id?: string | null
          fecha?: string
          id?: string
          importe: number
          medio?: Database["public"]["Enums"]["medio_pago"]
          motivo_reversion?: string | null
          operacion_id?: string | null
          par_transferencia?: string | null
          revierte_a?: string | null
          tercero_id?: string | null
        }
        Update: {
          cheque_id?: string | null
          concepto?: string
          created_at?: string
          created_by?: string | null
          cuenta_id?: string
          estado?: Database["public"]["Enums"]["estado_movimiento"]
          extracto_linea_id?: string | null
          fecha?: string
          id?: string
          importe?: number
          medio?: Database["public"]["Enums"]["medio_pago"]
          motivo_reversion?: string | null
          operacion_id?: string | null
          par_transferencia?: string | null
          revierte_a?: string | null
          tercero_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_cheque_fk"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cheque_fk"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "v_cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "movimientos_extracto_fk"
            columns: ["extracto_linea_id"]
            isOneToOne: false
            referencedRelation: "extracto_lineas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_par_transferencia_fkey"
            columns: ["par_transferencia"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_revierte_a_fkey"
            columns: ["revierte_a"]
            isOneToOne: true
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "movimientos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      numeradores: {
        Row: {
          modalidad: Database["public"]["Enums"]["modalidad_operacion"]
          prefijo: string
          ultimo: number
        }
        Insert: {
          modalidad: Database["public"]["Enums"]["modalidad_operacion"]
          prefijo: string
          ultimo?: number
        }
        Update: {
          modalidad?: Database["public"]["Enums"]["modalidad_operacion"]
          prefijo?: string
          ultimo?: number
        }
        Relationships: []
      }
      obligaciones: {
        Row: {
          ajuste_id: string | null
          anulada: boolean
          comision_id: string | null
          concepto: string
          created_at: string
          created_by: string | null
          exigible: boolean
          fecha: string
          gasto_id: string | null
          id: string
          importe: number
          motivo_anulacion: string | null
          numero_comprobante: string | null
          operacion_id: string | null
          sentido: Database["public"]["Enums"]["sentido_obligacion"]
          tercero_id: string
          tipo: Database["public"]["Enums"]["tipo_obligacion"]
          vencimiento: string | null
        }
        Insert: {
          ajuste_id?: string | null
          anulada?: boolean
          comision_id?: string | null
          concepto: string
          created_at?: string
          created_by?: string | null
          exigible?: boolean
          fecha?: string
          gasto_id?: string | null
          id?: string
          importe: number
          motivo_anulacion?: string | null
          numero_comprobante?: string | null
          operacion_id?: string | null
          sentido: Database["public"]["Enums"]["sentido_obligacion"]
          tercero_id: string
          tipo: Database["public"]["Enums"]["tipo_obligacion"]
          vencimiento?: string | null
        }
        Update: {
          ajuste_id?: string | null
          anulada?: boolean
          comision_id?: string | null
          concepto?: string
          created_at?: string
          created_by?: string | null
          exigible?: boolean
          fecha?: string
          gasto_id?: string | null
          id?: string
          importe?: number
          motivo_anulacion?: string | null
          numero_comprobante?: string | null
          operacion_id?: string | null
          sentido?: Database["public"]["Enums"]["sentido_obligacion"]
          tercero_id?: string
          tipo?: Database["public"]["Enums"]["tipo_obligacion"]
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_ajuste_id_fkey"
            columns: ["ajuste_id"]
            isOneToOne: false
            referencedRelation: "operacion_ajustes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: true
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: true
            referencedRelation: "v_operaciones"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "obligaciones_gasto_fk"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_gasto_fk"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "v_gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      operacion_ajustes: {
        Row: {
          created_at: string
          delta_bolsas: number
          fecha: string
          id: string
          motivo: string
          operacion_id: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          delta_bolsas: number
          fecha?: string
          id?: string
          motivo: string
          operacion_id: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          delta_bolsas?: number
          fecha?: string
          id?: string
          motivo?: string
          operacion_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_ajustes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_ajustes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "operacion_ajustes_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operaciones: {
        Row: {
          alicuota_iva: number
          bolsas_ajustes: number
          bolsas_cargadas: number
          bolsas_en_custodia: boolean
          bolsas_negociadas: number
          comision_tipo: Database["public"]["Enums"]["tipo_comision"]
          comision_valor: number | null
          comisionista_id: string | null
          comprador_id: string | null
          condiciones_pago: string | null
          costo_dyc: number
          costo_flete: number
          costo_ganancias: number
          costo_iibb: number
          costo_otros: number
          created_at: string
          created_by: string | null
          deposito_id: string | null
          estado_comercial: Database["public"]["Enums"]["estado_comercial"]
          estado_logistico: Database["public"]["Enums"]["estado_logistico"]
          fecha_cierre: string
          id: string
          ingenio_id: string | null
          kg_por_bolsa: number
          marca_id: string | null
          modalidad: Database["public"]["Enums"]["modalidad_operacion"]
          motivo_cancelacion: string | null
          numero: string
          numero_seq: number
          observaciones: string | null
          precio_compra: number
          precio_venta: number | null
          precios_incluyen_iva: boolean
          producto_id: string | null
          ubicacion_tipo: Database["public"]["Enums"]["tipo_ubicacion"] | null
          updated_at: string
          vendedor_id: string
          zafra: number | null
        }
        Insert: {
          alicuota_iva?: number
          bolsas_ajustes?: number
          bolsas_cargadas?: number
          bolsas_en_custodia?: boolean
          bolsas_negociadas: number
          comision_tipo?: Database["public"]["Enums"]["tipo_comision"]
          comision_valor?: number | null
          comisionista_id?: string | null
          comprador_id?: string | null
          condiciones_pago?: string | null
          costo_dyc?: number
          costo_flete?: number
          costo_ganancias?: number
          costo_iibb?: number
          costo_otros?: number
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          estado_comercial?: Database["public"]["Enums"]["estado_comercial"]
          estado_logistico?: Database["public"]["Enums"]["estado_logistico"]
          fecha_cierre?: string
          id?: string
          ingenio_id?: string | null
          kg_por_bolsa?: number
          marca_id?: string | null
          modalidad: Database["public"]["Enums"]["modalidad_operacion"]
          motivo_cancelacion?: string | null
          numero: string
          numero_seq: number
          observaciones?: string | null
          precio_compra: number
          precio_venta?: number | null
          precios_incluyen_iva?: boolean
          producto_id?: string | null
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
          updated_at?: string
          vendedor_id: string
          zafra?: number | null
        }
        Update: {
          alicuota_iva?: number
          bolsas_ajustes?: number
          bolsas_cargadas?: number
          bolsas_en_custodia?: boolean
          bolsas_negociadas?: number
          comision_tipo?: Database["public"]["Enums"]["tipo_comision"]
          comision_valor?: number | null
          comisionista_id?: string | null
          comprador_id?: string | null
          condiciones_pago?: string | null
          costo_dyc?: number
          costo_flete?: number
          costo_ganancias?: number
          costo_iibb?: number
          costo_otros?: number
          created_at?: string
          created_by?: string | null
          deposito_id?: string | null
          estado_comercial?: Database["public"]["Enums"]["estado_comercial"]
          estado_logistico?: Database["public"]["Enums"]["estado_logistico"]
          fecha_cierre?: string
          id?: string
          ingenio_id?: string | null
          kg_por_bolsa?: number
          marca_id?: string | null
          modalidad?: Database["public"]["Enums"]["modalidad_operacion"]
          motivo_cancelacion?: string | null
          numero?: string
          numero_seq?: number
          observaciones?: string | null
          precio_compra?: number
          precio_venta?: number | null
          precios_incluyen_iva?: boolean
          producto_id?: string | null
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
          updated_at?: string
          vendedor_id?: string
          zafra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "operaciones_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_ingenio_id_fkey"
            columns: ["ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      reparto_gastos: {
        Row: {
          es_agrovia: boolean
          gasto_id: string
          id: string
          participante: string
          porcentaje: number
          tercero_id: string | null
        }
        Insert: {
          es_agrovia?: boolean
          gasto_id: string
          id?: string
          participante: string
          porcentaje: number
          tercero_id?: string | null
        }
        Update: {
          es_agrovia?: boolean
          gasto_id?: string
          id?: string
          participante?: string
          porcentaje?: number
          tercero_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reparto_gastos_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reparto_gastos_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "v_gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reparto_gastos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reparto_gastos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "reparto_gastos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      reposicion_movimientos: {
        Row: {
          bolsas: number
          created_at: string
          fecha: string
          id: string
          observaciones: string | null
          remito: string | null
          reposicion_id: string
        }
        Insert: {
          bolsas: number
          created_at?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          remito?: string | null
          reposicion_id: string
        }
        Update: {
          bolsas?: number
          created_at?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          remito?: string | null
          reposicion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposicion_movimientos_reposicion_id_fkey"
            columns: ["reposicion_id"]
            isOneToOne: false
            referencedRelation: "reposiciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposicion_movimientos_reposicion_id_fkey"
            columns: ["reposicion_id"]
            isOneToOne: false
            referencedRelation: "v_reposiciones"
            referencedColumns: ["id"]
          },
        ]
      }
      reposiciones: {
        Row: {
          bolsas: number
          created_at: string
          detalle: string | null
          fecha: string
          fecha_prevista: string | null
          id: string
          motivo: string
          operacion_origen_id: string | null
          sentido: string
          tercero_id: string
        }
        Insert: {
          bolsas: number
          created_at?: string
          detalle?: string | null
          fecha?: string
          fecha_prevista?: string | null
          id?: string
          motivo: string
          operacion_origen_id?: string | null
          sentido: string
          tercero_id: string
        }
        Update: {
          bolsas?: number
          created_at?: string
          detalle?: string | null
          fecha?: string
          fecha_prevista?: string | null
          id?: string
          motivo?: string
          operacion_origen_id?: string | null
          sentido?: string
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      seguimiento_pagos_directos: {
        Row: {
          created_at: string
          fecha: string
          id: string
          importe: number
          medio: string | null
          observaciones: string | null
          operacion_id: string
          referencia: string | null
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          importe: number
          medio?: string | null
          observaciones?: string | null
          operacion_id: string
          referencia?: string | null
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          medio?: string | null
          observaciones?: string | null
          operacion_id?: string
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_pagos_directos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_pagos_directos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "seguimiento_pagos_directos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movimientos: {
        Row: {
          ajuste_id: string | null
          bolsas: number
          carga_id: string | null
          costo_unitario: number | null
          created_at: string
          deposito_id: string | null
          fecha: string
          id: string
          ingenio_id: string | null
          marca_id: string | null
          motivo: string | null
          operacion_id: string | null
          producto_id: string | null
          reposicion_mov_id: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_stock"]
          ubicacion_tipo: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Insert: {
          ajuste_id?: string | null
          bolsas: number
          carga_id?: string | null
          costo_unitario?: number | null
          created_at?: string
          deposito_id?: string | null
          fecha?: string
          id?: string
          ingenio_id?: string | null
          marca_id?: string | null
          motivo?: string | null
          operacion_id?: string | null
          producto_id?: string | null
          reposicion_mov_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_stock"]
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Update: {
          ajuste_id?: string | null
          bolsas?: number
          carga_id?: string | null
          costo_unitario?: number | null
          created_at?: string
          deposito_id?: string | null
          fecha?: string
          id?: string
          ingenio_id?: string | null
          marca_id?: string | null
          motivo?: string | null
          operacion_id?: string | null
          producto_id?: string | null
          reposicion_mov_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mov_stock"]
          ubicacion_tipo?: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_ajuste_id_fkey"
            columns: ["ajuste_id"]
            isOneToOne: false
            referencedRelation: "operacion_ajustes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_ingenio_id_fkey"
            columns: ["ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "stock_movimientos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      tercero_cuentas_bancarias: {
        Row: {
          alias: string | null
          banco: string | null
          cbu: string | null
          id: string
          tercero_id: string
          titular: string | null
        }
        Insert: {
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          id?: string
          tercero_id: string
          titular?: string | null
        }
        Update: {
          alias?: string | null
          banco?: string | null
          cbu?: string | null
          id?: string
          tercero_id?: string
          titular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tercero_cuentas_bancarias_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tercero_cuentas_bancarias_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "tercero_cuentas_bancarias_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      tercero_roles: {
        Row: {
          rol: Database["public"]["Enums"]["tipo_rol_tercero"]
          tercero_id: string
        }
        Insert: {
          rol: Database["public"]["Enums"]["tipo_rol_tercero"]
          tercero_id: string
        }
        Update: {
          rol?: Database["public"]["Enums"]["tipo_rol_tercero"]
          tercero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tercero_roles_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tercero_roles_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "tercero_roles_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      terceros: {
        Row: {
          activo: boolean
          condicion_fiscal: string | null
          contacto: string | null
          created_at: string
          cuit: string | null
          domicilio: string | null
          email: string | null
          id: string
          nombre_comercial: string | null
          observaciones: string | null
          provincia: string | null
          razon_social: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          condicion_fiscal?: string | null
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          provincia?: string | null
          razon_social: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          condicion_fiscal?: string | null
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          provincia?: string | null
          razon_social?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_cheques: {
        Row: {
          aplicado_a_cobros: number | null
          aplicado_a_pagos: number | null
          banco: string | null
          beneficiario_id: string | null
          created_at: string | null
          cuenta_id: string | null
          cuit_librador: string | null
          disponible_en_cartera: number | null
          entregado_por_id: string | null
          estado: Database["public"]["Enums"]["estado_cheque"] | null
          fecha_emision: string | null
          fecha_pago: string | null
          fecha_recepcion: string | null
          id: string | null
          importe: number | null
          librador: string | null
          numero: string | null
          observaciones: string | null
          operacion_id: string | null
          origen: string | null
          tipo: string | null
        }
        Insert: {
          aplicado_a_cobros?: never
          aplicado_a_pagos?: never
          banco?: string | null
          beneficiario_id?: string | null
          created_at?: string | null
          cuenta_id?: string | null
          cuit_librador?: string | null
          disponible_en_cartera?: never
          entregado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_cheque"] | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          fecha_recepcion?: string | null
          id?: string | null
          importe?: number | null
          librador?: string | null
          numero?: string | null
          observaciones?: string | null
          operacion_id?: string | null
          origen?: string | null
          tipo?: string | null
        }
        Update: {
          aplicado_a_cobros?: never
          aplicado_a_pagos?: never
          banco?: string | null
          beneficiario_id?: string | null
          created_at?: string | null
          cuenta_id?: string | null
          cuit_librador?: string | null
          disponible_en_cartera?: never
          entregado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_cheque"] | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          fecha_recepcion?: string | null
          id?: string | null
          importe?: number | null
          librador?: string | null
          numero?: string | null
          observaciones?: string | null
          operacion_id?: string | null
          origen?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "cheques_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "cheques_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_tesoreria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_saldos_cuentas"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "cheques_entregado_por_id_fkey"
            columns: ["entregado_por_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "cheques_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      v_comisiones_percibidas: {
        Row: {
          cobrado_neto: number | null
          cobrado_neto_agrovia: number | null
          mes: string | null
          modalidad: Database["public"]["Enums"]["modalidad_operacion"] | null
          numero: string | null
          operacion_id: string | null
        }
        Relationships: []
      }
      v_cuentas_corrientes: {
        Row: {
          a_cobrar: number | null
          a_cobrar_no_exigible: number | null
          a_pagar: number | null
          anticipos_entregados: number | null
          anticipos_recibidos: number | null
          cobros_anticipados: number | null
          razon_social: string | null
          saldo_neto: number | null
          tercero_id: string | null
        }
        Relationships: []
      }
      v_custodia_fisicas: {
        Row: {
          bolsas: number | null
          dueno_id: string | null
          lugar_id: string | null
        }
        Relationships: []
      }
      v_custodia_saldos: {
        Row: {
          a_reponer: number | null
          a_reponer_total: number | null
          libres: number | null
          vendidas_sin_cargar: number | null
          dueno: string | null
          dueno_id: string | null
          fisicas: number | null
          pagado_en_plata: number | null
          ultimo_movimiento: string | null
        }
        Relationships: []
      }
      v_gastos: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          descuento_id: string | null
          fecha: string | null
          forma: string | null
          id: string | null
          importe_neto: number | null
          iva: number | null
          movimiento_id: string | null
          numero_factura: string | null
          operacion_id: string | null
          otros_impuestos: number | null
          parte_agrovia: number | null
          proveedor_id: string | null
          total: number | null
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descuento_id?: string | null
          fecha?: string | null
          forma?: string | null
          id?: string | null
          importe_neto?: number | null
          iva?: number | null
          movimiento_id?: string | null
          numero_factura?: string | null
          operacion_id?: string | null
          otros_impuestos?: number | null
          parte_agrovia?: never
          proveedor_id?: string | null
          total?: number | null
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descuento_id?: string | null
          fecha?: string | null
          forma?: string | null
          id?: string | null
          importe_neto?: number | null
          iva?: number | null
          movimiento_id?: string | null
          numero_factura?: string | null
          operacion_id?: string | null
          otros_impuestos?: number | null
          parte_agrovia?: never
          proveedor_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_descuento_id_fkey"
            columns: ["descuento_id"]
            isOneToOne: false
            referencedRelation: "descuentos_cheque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "gastos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      v_obligaciones: {
        Row: {
          ajuste_id: string | null
          anulada: boolean | null
          aplicado: number | null
          comision_id: string | null
          concepto: string | null
          created_at: string | null
          created_by: string | null
          dias_atraso: number | null
          exigible: boolean | null
          fecha: string | null
          gasto_id: string | null
          id: string | null
          importe: number | null
          motivo_anulacion: string | null
          numero_comprobante: string | null
          operacion_id: string | null
          pendiente: number | null
          sentido: Database["public"]["Enums"]["sentido_obligacion"] | null
          tercero_id: string | null
          tipo: Database["public"]["Enums"]["tipo_obligacion"] | null
          vencimiento: string | null
        }
        Insert: {
          ajuste_id?: string | null
          anulada?: boolean | null
          aplicado?: never
          comision_id?: string | null
          concepto?: string | null
          created_at?: string | null
          created_by?: string | null
          dias_atraso?: never
          exigible?: boolean | null
          fecha?: string | null
          gasto_id?: string | null
          id?: string | null
          importe?: number | null
          motivo_anulacion?: string | null
          numero_comprobante?: string | null
          operacion_id?: string | null
          pendiente?: never
          sentido?: Database["public"]["Enums"]["sentido_obligacion"] | null
          tercero_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_obligacion"] | null
          vencimiento?: string | null
        }
        Update: {
          ajuste_id?: string | null
          anulada?: boolean | null
          aplicado?: never
          comision_id?: string | null
          concepto?: string | null
          created_at?: string | null
          created_by?: string | null
          dias_atraso?: never
          exigible?: boolean | null
          fecha?: string | null
          gasto_id?: string | null
          id?: string | null
          importe?: number | null
          motivo_anulacion?: string | null
          numero_comprobante?: string | null
          operacion_id?: string | null
          pendiente?: never
          sentido?: Database["public"]["Enums"]["sentido_obligacion"] | null
          tercero_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_obligacion"] | null
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_ajuste_id_fkey"
            columns: ["ajuste_id"]
            isOneToOne: false
            referencedRelation: "operacion_ajustes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: true
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: true
            referencedRelation: "v_operaciones"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "obligaciones_gasto_fk"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_gasto_fk"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "v_gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "obligaciones_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "obligaciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      v_operaciones: {
        Row: {
          alicuota_iva: number | null
          avance_carga_pct: number | null
          bolsas_ajustes: number | null
          bolsas_cargadas: number | null
          bolsas_negociadas: number | null
          bolsas_pendientes: number | null
          bolsas_totales: number | null
          cobro_anticipado: boolean | null
          cobro_parcial: boolean | null
          comision_bruta: number | null
          comision_id: string | null
          comision_neta_agrovia: number | null
          comision_tipo: Database["public"]["Enums"]["tipo_comision"] | null
          comision_valor: number | null
          comisionista_id: string | null
          comprador: string | null
          comprador_id: string | null
          condiciones_pago: string | null
          costo_dyc: number | null
          costo_flete: number | null
          costo_ganancias: number | null
          costo_iibb: number | null
          costo_otros: number | null
          created_at: string | null
          created_by: string | null
          deposito_id: string | null
          estado_comercial:
            | Database["public"]["Enums"]["estado_comercial"]
            | null
          estado_comision: Database["public"]["Enums"]["estado_comision"] | null
          estado_logistico:
            | Database["public"]["Enums"]["estado_logistico"]
            | null
          fecha_cierre: string | null
          fecha_cobro: string | null
          fecha_exigible: string | null
          id: string | null
          importe_cobrado: number | null
          ingenio_id: string | null
          kg_por_bolsa: number | null
          marca_id: string | null
          modalidad: Database["public"]["Enums"]["modalidad_operacion"] | null
          motivo_cancelacion: string | null
          numero: string | null
          numero_seq: number | null
          observaciones: string | null
          precio_compra: number | null
          precio_venta: number | null
          precios_incluyen_iva: boolean | null
          producto_id: string | null
          ubicacion_tipo: Database["public"]["Enums"]["tipo_ubicacion"] | null
          updated_at: string | null
          vendedor: string | null
          vendedor_id: string | null
          zafra: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_comisionista_id_fkey"
            columns: ["comisionista_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
          {
            foreignKeyName: "operaciones_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_ingenio_id_fkey"
            columns: ["ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "operaciones_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      v_reposiciones: {
        Row: {
          bolsas: number | null
          created_at: string | null
          detalle: string | null
          fecha: string | null
          fecha_prevista: string | null
          id: string | null
          motivo: string | null
          operacion_origen_id: string | null
          pendiente: number | null
          sentido: string | null
          tercero_id: string | null
        }
        Insert: {
          bolsas?: number | null
          created_at?: string | null
          detalle?: string | null
          fecha?: string | null
          fecha_prevista?: string | null
          id?: string | null
          motivo?: string | null
          operacion_origen_id?: string | null
          pendiente?: never
          sentido?: string | null
          tercero_id?: string | null
        }
        Update: {
          bolsas?: number | null
          created_at?: string | null
          detalle?: string | null
          fecha?: string | null
          fecha_prevista?: string | null
          id?: string | null
          motivo?: string | null
          operacion_origen_id?: string | null
          pendiente?: never
          sentido?: string | null
          tercero_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "v_comisiones_percibidas"
            referencedColumns: ["operacion_id"]
          },
          {
            foreignKeyName: "reposiciones_operacion_origen_id_fkey"
            columns: ["operacion_origen_id"]
            isOneToOne: false
            referencedRelation: "v_operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_cuentas_corrientes"
            referencedColumns: ["tercero_id"]
          },
          {
            foreignKeyName: "reposiciones_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "v_custodia_saldos"
            referencedColumns: ["dueno_id"]
          },
        ]
      }
      v_saldos_cuentas: {
        Row: {
          borradores: number | null
          cuenta_id: string | null
          nombre: string | null
          saldo: number | null
          tipo: string | null
        }
        Relationships: []
      }
      v_stock: {
        Row: {
          deposito_id: string | null
          disponible_para_vender: number | null
          ingenio_id: string | null
          marca_id: string | null
          producto_id: string | null
          stock: number | null
          ubicacion_tipo: Database["public"]["Enums"]["tipo_ubicacion"] | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_deposito_id_fkey"
            columns: ["deposito_id"]
            isOneToOne: false
            referencedRelation: "depositos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_ingenio_id_fkey"
            columns: ["ingenio_id"]
            isOneToOne: false
            referencedRelation: "ingenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anticipo_disponible: { Args: { p_anticipo_id: string }; Returns: number }
      auditar_tabla: { Args: { p_tabla: unknown }; Returns: undefined }
      bolsas_pendientes: {
        Args: { o: Database["public"]["Tables"]["operaciones"]["Row"] }
        Returns: number
      }
      bolsas_totales: {
        Args: { o: Database["public"]["Tables"]["operaciones"]["Row"] }
        Returns: number
      }
      calcular_importe_comision: {
        Args: { o: Database["public"]["Tables"]["operaciones"]["Row"] }
        Returns: number
      }
      cheque_transicion_valida: {
        Args: {
          p_a: Database["public"]["Enums"]["estado_cheque"]
          p_de: Database["public"]["Enums"]["estado_cheque"]
          p_origen: string
        }
        Returns: boolean
      }
      cheque_usado: {
        Args: {
          p_cheque_id: string
          p_sentido: Database["public"]["Enums"]["sentido_obligacion"]
        }
        Returns: number
      }
      comision_cobros: {
        Args: { p_comision_id: string; p_importe: number }
        Returns: Record<string, unknown>
      }
      conciliar_linea: {
        Args: { p_linea_id: string; p_movimiento_id: string }
        Returns: undefined
      }
      custodia_lugar: {
        Args: { p_deposito: string; p_ingenio: string }
        Returns: string
      }
      descontar_cheque: {
        Args: {
          p_cheque_id: string
          p_comisiones?: number
          p_cuenta_id: string
          p_dias: number
          p_dias_clearing?: number
          p_entidad: string
          p_fecha?: string
          p_iva_comisiones?: number
          p_tasa_mensual: number
        }
        Returns: string
      }
      endosar_cheque: {
        Args: {
          p_beneficiario_id: string
          p_cheque_id: string
          p_importe?: number
          p_obligacion_id?: string
        }
        Returns: undefined
      }
      es_escritura_interna: { Args: never; Returns: boolean }
      es_usuario_activo: { Args: never; Returns: boolean }
      exigir_rol: {
        Args: { roles: Database["public"]["Enums"]["rol_usuario"][] }
        Returns: undefined
      }
      huella_linea: {
        Args: {
          p_cuenta: string
          p_fecha: string
          p_importe: number
          p_orden: number
          p_referencia: string
          p_saldo: number
        }
        Returns: string
      }
      importe_operacion: {
        Args: {
          o: Database["public"]["Tables"]["operaciones"]["Row"]
          p_bolsas: number
          p_precio: number
        }
        Returns: number
      }
      movimiento_desde_linea: {
        Args: {
          p_concepto: string
          p_linea_id: string
          p_medio?: Database["public"]["Enums"]["medio_pago"]
          p_tercero_id?: string
        }
        Returns: string
      }
      movimiento_disponible: {
        Args: { p_movimiento_id: string }
        Returns: number
      }
      obligacion_aplicado: {
        Args: { p_obligacion_id: string }
        Returns: number
      }
      obligacion_pendiente: {
        Args: { p_obligacion_id: string }
        Returns: number
      }
      recalcular_comision: {
        Args: { p_operacion_id: string }
        Returns: undefined
      }
      recalcular_logistica: {
        Args: { p_operacion_id: string }
        Returns: undefined
      }
      revertir_movimiento: {
        Args: { p_motivo: string; p_movimiento_id: string }
        Returns: string
      }
      set_interno: { Args: { p_on: boolean }; Returns: undefined }
      sincronizar_obligaciones_operacion: {
        Args: { p_operacion_id: string }
        Returns: undefined
      }
      tiene_rol: {
        Args: { roles: Database["public"]["Enums"]["rol_usuario"][] }
        Returns: boolean
      }
      transferir_entre_cuentas: {
        Args: {
          p_concepto?: string
          p_destino: string
          p_fecha?: string
          p_importe: number
          p_origen: string
        }
        Returns: string
      }
    }
    Enums: {
      estado_cheque:
        | "en_cartera"
        | "endosado"
        | "depositado"
        | "acreditado"
        | "descontado"
        | "rechazado"
        | "emitido"
        | "debitado"
        | "anulado"
      estado_comercial: "cerrada" | "cancelada"
      estado_comision:
        | "esperando_carga"
        | "pendiente_cobro"
        | "cobrada"
        | "sin_comision"
        | "anulada"
      estado_linea_extracto:
        | "nueva"
        | "conciliada"
        | "pendiente_identificar"
        | "ignorada"
      estado_logistico: "sin_cargar" | "carga_parcial" | "carga_completada"
      estado_movimiento: "borrador" | "confirmado" | "revertido"
      medio_pago:
        | "transferencia"
        | "efectivo"
        | "cheque"
        | "echeq"
        | "debito_automatico"
        | "tarjeta"
        | "otro"
      modalidad_operacion: "facturado" | "menudeo" | "compraventa"
      origen_aplicacion:
        | "movimiento"
        | "cheque"
        | "anticipo"
        | "compensacion"
        | "retencion"
        | "previo"
      rol_usuario: "admin" | "operador" | "finanzas" | "lectura"
      sentido_obligacion: "cobrar" | "pagar"
      tipo_comision: "diferencia" | "por_bolsa" | "fija" | "porcentaje"
      tipo_mov_custodia:
        | "ingreso"
        | "traslado"
        | "entrega"
        | "reposicion"
        | "pago_plata"
        | "retiro"
      tipo_mov_stock:
        | "entrada_compra"
        | "salida_carga"
        | "ajuste"
        | "reposicion"
      tipo_obligacion:
        | "factura"
        | "liquido_producto"
        | "venta_sin_factura"
        | "compra_sin_factura"
        | "comision"
        | "nota_debito"
        | "nota_credito"
        | "saldo_inicial"
        | "otro"
      tipo_rol_tercero:
        | "comprador"
        | "productor"
        | "proveedor"
        | "transportista"
        | "comisionista"
        | "otro"
      tipo_ubicacion: "ingenio" | "deposito"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cheque: [
        "en_cartera",
        "endosado",
        "depositado",
        "acreditado",
        "descontado",
        "rechazado",
        "emitido",
        "debitado",
        "anulado",
      ],
      estado_comercial: ["cerrada", "cancelada"],
      estado_comision: [
        "esperando_carga",
        "pendiente_cobro",
        "cobrada",
        "sin_comision",
        "anulada",
      ],
      estado_linea_extracto: [
        "nueva",
        "conciliada",
        "pendiente_identificar",
        "ignorada",
      ],
      estado_logistico: ["sin_cargar", "carga_parcial", "carga_completada"],
      estado_movimiento: ["borrador", "confirmado", "revertido"],
      medio_pago: [
        "transferencia",
        "efectivo",
        "cheque",
        "echeq",
        "debito_automatico",
        "tarjeta",
        "otro",
      ],
      modalidad_operacion: ["facturado", "menudeo", "compraventa"],
      origen_aplicacion: [
        "movimiento",
        "cheque",
        "anticipo",
        "compensacion",
        "retencion",
        "previo",
      ],
      rol_usuario: ["admin", "operador", "finanzas", "lectura"],
      sentido_obligacion: ["cobrar", "pagar"],
      tipo_comision: ["diferencia", "por_bolsa", "fija", "porcentaje"],
      tipo_mov_custodia: [
        "ingreso",
        "traslado",
        "entrega",
        "reposicion",
        "pago_plata",
        "retiro",
      ],
      tipo_mov_stock: [
        "entrada_compra",
        "salida_carga",
        "ajuste",
        "reposicion",
      ],
      tipo_obligacion: [
        "factura",
        "liquido_producto",
        "venta_sin_factura",
        "compra_sin_factura",
        "comision",
        "nota_debito",
        "nota_credito",
        "saldo_inicial",
        "otro",
      ],
      tipo_rol_tercero: [
        "comprador",
        "productor",
        "proveedor",
        "transportista",
        "comisionista",
        "otro",
      ],
      tipo_ubicacion: ["ingenio", "deposito"],
    },
  },
} as const
