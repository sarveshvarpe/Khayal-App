"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"

const markerIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) return
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [markers, map])

  return null
}

export interface MapMarker {
  lat: number
  lng: number
  name: string
  address?: string
  phone?: string
  description?: string
}

interface MapProps {
  markers: MapMarker[]
  center?: [number, number]
  zoom?: number
  className?: string
  style?: React.CSSProperties
}

export default function Map({ markers, center, zoom, className, style }: MapProps) {
  const defaultCenter: [number, number] = center ?? [40.7128, -74.006]
  const defaultZoom = zoom ?? 12

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className={className ?? "w-full h-[400px] rounded-xl z-0"}
      style={style}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.length > 0 && <FitBounds markers={markers} />}
      {markers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={markerIcon}>
          <Popup>
            <strong>{m.name}</strong>
            {m.description && <><br /><span style={{ fontSize: "0.85em", color: "#666" }}>{m.description}</span></>}
            {m.address && <><br />{m.address}</>}
            {m.phone && <><br />{m.phone}</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
