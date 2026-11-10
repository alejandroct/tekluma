import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ContenidoTarjeta } from "@tekluma/shared";
import { generarCaso } from "@/lib/caso";
import { useTema } from "@/lib/tema";

type Props = {
  contenido: ContenidoTarjeta;
  revelada: boolean;
  onRevelar: () => void;
};

/**
 * Figura de la norma (gráfico o tabla extraída del PDF). Va embebida en el paquete, así que se
 * cifra con él; se muestra sobre blanco para que se lea igual en modo oscuro.
 */
/** Figura de la tarjeta sobre fondo blanco, con su proporción real. */
export function Figura({ uri }: { uri: string }) {
  const t = useTema();
  const [proporcion, setProporcion] = useState(4 / 3);
  return (
    <View style={[estilos.figura, { borderColor: t.borde }]}>
      <Image
        source={{ uri }}
        style={{ width: "100%", aspectRatio: proporcion }}
        resizeMode="contain"
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width && height) setProporcion(width / height);
        }}
      />
    </View>
  );
}

/** Muestra el anverso según el tipo de tarjeta y, al revelarse, la respuesta. */
export function Tarjeta(props: Props) {
  const { imagenUrl } = props.contenido;
  if (!imagenUrl) return <Anverso {...props} />;
  return (
    <View style={estilos.cuerpo}>
      <Figura uri={imagenUrl} />
      <Anverso {...props} />
    </View>
  );
}

function Anverso({ contenido, revelada, onRevelar }: Props) {
  const t = useTema();
  const texto = [estilos.texto, { color: t.texto }];
  const suave = [estilos.suave, { color: t.textoSuave }];

  switch (contenido.tipo) {
    case "concepto":
    case "imagen":
      return (
        <View style={estilos.cuerpo}>
          <Text style={texto}>{contenido.pregunta}</Text>
          {revelada ? <Respuesta>{contenido.respuesta}</Respuesta> : <BotonRevelar onPress={onRevelar} />}
          {revelada && contenido.explicacion ? <Text style={suave}>{contenido.explicacion}</Text> : null}
        </View>
      );

    case "completar": {
      const [antes, oculto, despues] = contenido.texto.split(/\{\{(.+?)\}\}/);
      return (
        <View style={estilos.cuerpo}>
          <Text style={texto}>
            {antes}
            <Text style={{ color: t.ambar, fontWeight: "700" }}>{revelada ? oculto : " ____ "}</Text>
            {despues}
          </Text>
          {!revelada && <BotonRevelar onPress={onRevelar} />}
        </View>
      );
    }

    case "opcion_multiple":
      return <OpcionMultiple contenido={contenido} revelada={revelada} onRevelar={onRevelar} />;

    case "tabla": {
      const { fila, columna } = contenido.pregunta;
      const f = contenido.filas[fila];
      return (
        <View style={estilos.cuerpo}>
          <Text style={suave}>{contenido.titulo}</Text>
          <Text style={texto}>
            {f?.etiqueta} → ¿{contenido.columnas[columna]}?
          </Text>
          {revelada ? (
            <View style={[estilos.tabla, { borderColor: t.borde }]}>
              {contenido.filas.map((r, i) => (
                <View key={r.etiqueta} style={[estilos.filaTabla, i === fila && { backgroundColor: "rgba(255,138,31,0.14)", borderLeftWidth: 3, borderLeftColor: t.ambar }]}>
                  <Text style={{ color: i === fila ? t.navy : t.texto, fontWeight: i === fila ? "800" : "400" }}>{r.etiqueta}</Text>
                  <Text style={{ color: i === fila ? t.navy : t.texto, fontWeight: "700" }}>{r.valores[columna]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <BotonRevelar onPress={onRevelar} />
          )}
          {revelada && contenido.explicacion ? <Text style={suave}>{contenido.explicacion}</Text> : null}
        </View>
      );
    }

    case "caso_numerico":
      return <CasoNumerico contenido={contenido} revelada={revelada} onRevelar={onRevelar} />;
  }
}

function OpcionMultiple({ contenido, revelada, onRevelar }: Props & { contenido: Extract<ContenidoTarjeta, { tipo: "opcion_multiple" }> }) {
  const t = useTema();
  const [elegida, setElegida] = useState<number | null>(null);
  return (
    <View style={estilos.cuerpo}>
      <Text style={[estilos.texto, { color: t.texto }]}>{contenido.pregunta}</Text>
      {contenido.opciones.map((op, i) => {
        const correcta = revelada && i === contenido.correcta;
        const errada = revelada && i === elegida && i !== contenido.correcta;
        return (
          <Pressable
            key={op}
            disabled={revelada}
            onPress={() => {
              setElegida(i);
              onRevelar();
            }}
            style={[
              estilos.opcion,
              { borderColor: t.borde, backgroundColor: t.superficie },
              correcta && { backgroundColor: "#1F9D55", borderColor: "#1F9D55" },
              errada && { backgroundColor: "#D64545", borderColor: "#D64545" },
            ]}
          >
            <Text style={{ color: correcta || errada ? "#FFFFFF" : t.texto, fontSize: 16 }}>{op}</Text>
          </Pressable>
        );
      })}
      {revelada && contenido.explicacion ? <Text style={[estilos.suave, { color: t.textoSuave }]}>{contenido.explicacion}</Text> : null}
    </View>
  );
}

function CasoNumerico({ contenido, revelada, onRevelar }: Props & { contenido: Extract<ContenidoTarjeta, { tipo: "caso_numerico" }> }) {
  const t = useTema();
  const caso = useMemo(() => generarCaso(contenido), [contenido]);
  const [valor, setValor] = useState("");
  const numero = Number(valor.replace(",", "."));
  const acierto = Math.abs(numero - caso.resultado) <= Math.abs(caso.resultado) * contenido.tolerancia;
  return (
    <View style={estilos.cuerpo}>
      <Text style={[estilos.texto, { color: t.texto }]}>{caso.enunciado}</Text>
      <TextInput
        value={valor}
        onChangeText={setValor}
        editable={!revelada}
        keyboardType="decimal-pad"
        placeholder={`Resultado${contenido.unidadResultado ? ` (${contenido.unidadResultado})` : ""}`}
        placeholderTextColor={t.textoSuave}
        style={[estilos.input, { color: t.texto, borderColor: t.borde, backgroundColor: t.superficie }]}
      />
      {revelada ? (
        <Respuesta>
          {acierto ? "Correcto: " : "Resultado: "}
          {caso.resultado.toFixed(2)} {contenido.unidadResultado}
        </Respuesta>
      ) : (
        <BotonRevelar onPress={onRevelar} texto="Comprobar" />
      )}
    </View>
  );
}

function Respuesta({ children }: { children: React.ReactNode }) {
  const t = useTema();
  return (
    <View style={[estilos.respuesta, { borderColor: t.ambar, backgroundColor: t.superficie }]}>
      <Text style={[estilos.texto, { color: t.texto, fontWeight: "700" }]}>{children}</Text>
    </View>
  );
}

function BotonRevelar({ onPress, texto = "Mostrar respuesta" }: { onPress: () => void; texto?: string }) {
  const t = useTema();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilos.revelar, { backgroundColor: t.primario, opacity: pressed ? 0.85 : 1 }]}>
      <Text style={{ color: t.sobrePrimario, fontSize: 16, fontWeight: "700" }}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 14 },
  texto: { fontSize: 20, lineHeight: 28 },
  suave: { fontSize: 15, lineHeight: 21 },
  respuesta: { borderLeftWidth: 3, paddingLeft: 14, paddingRight: 14, paddingVertical: 12, borderRadius: 4 },
  revelar: { borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  opcion: { borderWidth: 1, borderRadius: 8, padding: 14 },
  tabla: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  filaTabla: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  // letterSpacing explícito: iOS reutiliza vistas nativas de TextInput y puede heredar el de otra pantalla.
  figura: { backgroundColor: "#FFFFFF", borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, padding: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 18, letterSpacing: 0 },
});
