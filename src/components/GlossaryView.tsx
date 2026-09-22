/**
 * Glossary & Reference Cheat-Sheet View for Networking Concepts
 */

import React from 'react';
import { BookOpen, Layers, Network, Gauge, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export const GlossaryView: React.FC = () => {
  const glossarySections = [
    {
      title: '1. Unités de Données Protocolaires (PDU - Protocol Data Unit)',
      icon: <Layers className="w-4 h-4 text-pink-400" />,
      items: [
        {
          term: 'Donnée / Message (Couches 7, 6, 5)',
          def: 'Données brutes générées par l’application logicielle (ex: requête HTTP, courriel SMTP, requête DNS).',
        },
        {
          term: 'Segment (Couche 4 - Transport TCP)',
          def: 'Données découpées et encapsulées avec un en-tête TCP contenant les numéros de ports (source & destination), numéros de séquence (SEQ) et d’acquittement (ACK) pour garantir l’ordre et la fiabilité.',
        },
        {
          term: 'Datagramme (Couche 4 - Transport UDP ou Couche 3 IP)',
          def: 'Bloc de données autonome transmis en mode non connecté (sans garantie de livraison ni d’ordre, mais à très faible latence).',
        },
        {
          term: 'Paquet (Couche 3 - Réseau IP)',
          def: 'Segment/Datagramme encapsulé avec un en-tête IPv4 ou IPv6 (adresses IP source et destination, TTL, numéro de protocole, somme de contrôle IP). C’est l’unité routable universelle.',
        },
        {
          term: 'Trame (Couche 2 - Liaison Ethernet IEEE 802.3)',
          def: 'Paquet IP encapsulé avec un en-tête Ethernet (adresses MAC source/destination, EtherType 0x0800) et terminé par une séquence de contrôle de trame FCS (CRC32 de 4 octets).',
        },
        {
          term: 'Train Binaire (Couche 1 - Physique)',
          def: 'Suite de bits (0 et 1) convertis en impulsions lumineuses, électriques ou radioélectriques sur le support physique.',
        },
      ],
    },
    {
      title: '2. Équipements Réseau & Périphériques',
      icon: <Network className="w-4 h-4 text-cyan-400" />,
      items: [
        {
          term: 'Commutateur (Switch - Couche 2)',
          def: 'Interconnecte des équipements sur un même réseau local (LAN). Il inspecte UNIQUEMENT l’en-tête Ethernet (Couche 2), apprend les adresses MAC dans sa table CAM et commute les trames sans modifier aucun octet (IP et TTL restent 100% intacts).',
        },
        {
          term: 'Routeur (Router - Couche 3)',
          def: 'Interconnecte différents sous-réseaux et réseaux distants (WAN). Il désencapsule la trame Ethernet, inspecte l’adresse IP destination (Couche 3), décrémente le TTL (-1), recalcule le checksum IPv4 et ré-encapsule le paquet dans une NOUVELLE trame Ethernet avec une nouvelle MAC source et une nouvelle MAC destination.',
        },
        {
          term: 'Passerelle par Défaut (Default Gateway)',
          def: 'L’adresse IP du routeur local à laquelle un hôte envoie tous les paquets destinés à des adresses IP hors de son sous-réseau local.',
        },
      ],
    },
    {
      title: '3. Notions de Débit & Overheads',
      icon: <Gauge className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          term: 'Débit Nominal (Liaison Physique)',
          def: 'Capacité maximale théorique de la ligne physique (ex: 1 Gbps = 1 milliard de bits par seconde = 125 Mo/s brut).',
        },
        {
          term: 'Débit Réel (Wire Throughput)',
          def: 'Volume réel transmis sur le câble, tenant compte de la latence aller-retour (RTT), de la fenêtre TCP (BDP) et des pertes de paquets.',
        },
        {
          term: 'Débit Utile (Goodput)',
          def: 'Vitesse effective à laquelle les données utiles de l’utilisateur sont livrées, après déduction de tous les en-têtes (Ethernet + IP + TCP + FCS + IFG + Préambule = 78 octets par paquet).',
        },
        {
          term: 'MTU (Maximum Transmission Unit)',
          def: 'Taille maximale d’un paquet IP transportable dans une trame Ethernet (standard = 1500 octets, Jumbo Frames = 9000 octets).',
        },
        {
          term: 'MSS (Maximum Segment Size)',
          def: 'Taille maximale de la charge utile applicative dans un segment TCP : MSS = MTU - 20 (IP) - 20 (TCP) = 1460 octets.',
        },
      ],
    },
    {
      title: '4. Détection d’Erreurs & Intégrité',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      items: [
        {
          term: 'CRC32 (Cyclic Redundancy Check)',
          def: 'Code polynomial de 32 bits (FCS) calculé sur toute la trame Ethernet via division modulo 2 (XOR). Il détecte 100% des erreurs simples, doubles, impaires et les salves de bruit jusqu’à 32 bits.',
        },
        {
          term: 'Bit de Parité (Paire / Impaire)',
          def: 'Ajoute 1 bit à chaque octet pour rendre le nombre total de 1 pair ou impair. Très rapide mais limité : si 2 bits s’inversent simultanément, l’erreur est indétectable.',
        },
        {
          term: 'Somme de Contrôle IP (RFC 1071 Checksum)',
          def: 'Somme en complément à 1 sur 16 bits de l’en-tête IP. Re-calculée obligatoirement par chaque routeur car le TTL diminue à chaque saut.',
        },
      ],
    },
  ];

  return (
    <div id="glossary-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Glossaire & Concepts Clés de la Pile Réseau
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Fiches mémo synthétiques pour réviser et maîtriser les concepts fondamentaux du modèle OSI et de TCP/IP.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {glossarySections.map((sec, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              {sec.icon}
              <h2 className="font-bold text-white text-sm">{sec.title}</h2>
            </div>

            <div className="space-y-3">
              {sec.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <h3 className="font-bold text-xs text-cyan-300 font-mono">{item.term}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.def}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
