/**
 * System Design Problem Definitions & Starter Architectures
 * Covers URL Shortener (TinyURL), Distributed Notification Service, and Real-Time Chat System.
 */

export const SYSTEM_DESIGN_PROBLEMS = [
  {
    id: 'url-shortener',
    title: 'Design a High-Throughput URL Shortener (TinyURL)',
    scale: '100M URLs generated/mo • 10B clicks/mo',
    readWriteRatio: '100 : 1 Read-heavy',
    description: 'Design a distributed, highly available URL shortening service similar to TinyURL or Bitly that converts long URLs into compact 7-character aliases and redirects users with minimal latency.',
    requirements: [
      'Given a long URL, generate a compact unique alias (e.g., 7-character base62 string).',
      'Redirect incoming short link requests with HTTP 301/302 in under 15ms latency.',
      '99.99% high availability with zero single points of failure.',
      'Support custom expiration dates and real-time click analytics (geo, device, referrer).'
    ],
    calculations: [
      'Write QPS: ~40 requests/sec (peak: 100/sec)',
      'Read QPS: ~4,000 requests/sec (peak: 8,000/sec)',
      '5-Year Storage: ~3 TB total data footprint (6B URLs × 500 bytes)',
      'RAM Caching: 20% Pareto hot cache = ~30 GB Redis cluster',
      'Network Bandwidth: ~4 MB/sec read traffic, ~20 KB/sec write traffic'
    ],
    recommendedTopology: [
      { name: 'API Gateway', role: 'Rate Limiting & TLS Termination', type: 'apiGateway' },
      { name: 'Redis Cache', role: 'LRU Hot-link Lookup (<5ms)', type: 'cache' },
      { name: 'Key Generation Service', role: 'Pre-computed Base62 Ranges', type: 'backendService' },
      { name: 'Postgres Cluster', role: 'Primary Writes & Read Replicas', type: 'database' }
    ],
    starterNodes: [
      { id: 'node-client', type: 'client', label: 'Client Devices', subtitle: 'Web & Mobile Browsers', x: 80, y: 180, width: 170, height: 75, color: '#3b82f6' },
      { id: 'node-cdn', type: 'cdn', label: 'Cloudflare CDN', subtitle: 'Edge Cache & TLS Offload', x: 290, y: 180, width: 170, height: 75, color: '#06b6d4' },
      { id: 'node-gateway', type: 'apiGateway', label: 'API Gateway', subtitle: 'Token Auth & Rate Limiter', x: 500, y: 180, width: 170, height: 75, color: '#8b5cf6' },
      { id: 'node-lb', type: 'loadBalancer', label: 'Load Balancer', subtitle: 'Round-Robin Layer 7', x: 710, y: 180, width: 170, height: 75, color: '#6366f1' },
      { id: 'node-service', type: 'backendService', label: 'URL Redirect Service', subtitle: 'Stateless Node.js Cluster', x: 920, y: 100, width: 180, height: 75, color: '#10b981' },
      { id: 'node-kgs', type: 'backendService', label: 'Key Generation Service', subtitle: 'Pre-computed Base62 IDs', x: 920, y: 260, width: 180, height: 75, color: '#10b981' },
      { id: 'node-cache', type: 'cache', label: 'Redis Hot Cache', subtitle: 'Hot 20% Links in RAM', x: 1140, y: 100, width: 170, height: 75, color: '#f59e0b' },
      { id: 'node-db-primary', type: 'database', label: 'PostgreSQL Primary', subtitle: 'ACID URL Mappings (Write)', x: 1140, y: 210, width: 180, height: 75, color: '#ec4899' },
      { id: 'node-db-replica', type: 'database', label: 'PostgreSQL Replicas', subtitle: 'Read-only Scaleout (Read)', x: 1140, y: 320, width: 180, height: 75, color: '#ec4899' }
    ],
    starterEdges: [
      { id: 'edge-1', from: 'node-client', to: 'node-cdn', label: 'HTTPS Request' },
      { id: 'edge-2', from: 'node-cdn', to: 'node-gateway', label: 'Cache Miss' },
      { id: 'edge-3', from: 'node-gateway', to: 'node-lb', label: 'Verified Traffic' },
      { id: 'edge-4', from: 'node-lb', to: 'node-service', label: 'GET /:shortCode' },
      { id: 'edge-5', from: 'node-lb', to: 'node-kgs', label: 'POST /api/shorten' },
      { id: 'edge-6', from: 'node-service', to: 'node-cache', label: '1. Check Cache' },
      { id: 'edge-7', from: 'node-service', to: 'node-db-replica', label: '2. DB Query' },
      { id: 'edge-8', from: 'node-kgs', to: 'node-db-primary', label: 'Insert Record' }
    ]
  },
  {
    id: 'notification-system',
    title: 'Design a Distributed Notification Service',
    scale: '10M notifications/day • Push, SMS, Email',
    readWriteRatio: 'Write-heavy events',
    description: 'Design a scalable, fault-tolerant notification platform that delivers high volumes of push notifications, transactional SMS messages, and emails with deduplication and priority tiering.',
    requirements: [
      'Multi-channel dispatch: Mobile Push (APNs / FCM), SMS (Twilio), and Email (SendGrid).',
      'At-most-once or at-least-once delivery with deduplication window.',
      'Priority queues for critical security OTPs vs promotional bulk broadcasts.',
      'User preference management (channel preferences, do-not-disturb hours).'
    ],
    calculations: [
      'Write QPS: ~120 events/sec (peak burst: 2,500/sec during campaigns)',
      'Message Payload: ~2 KB per event metadata',
      'Storage per year: ~7.3 TB event audit logs and delivery receipts',
      'Message Queue: Kafka cluster with 7-day retention = ~150 GB disk buffer',
      'Third-party dispatch throughput: 1,000 requests/sec with worker rate limiters'
    ],
    recommendedTopology: [
      { name: 'API Gateway', role: 'Authentication & Validation', type: 'apiGateway' },
      { name: 'Apache Kafka', role: 'Distributed Partitioned Queue', type: 'messageQueue' },
      { name: 'Redis Cache', role: 'Idempotency & Deduplication', type: 'cache' },
      { name: 'Notification Workers', role: 'Channel-specific Dispatchers', type: 'backendService' }
    ],
    starterNodes: [
      { id: 'node-services', type: 'client', label: 'Upstream Microservices', subtitle: 'Auth, Order, Billing services', x: 80, y: 180, width: 180, height: 75, color: '#3b82f6' },
      { id: 'node-gw', type: 'apiGateway', label: 'Notification Gateway', subtitle: 'Event Schema Validation', x: 300, y: 180, width: 180, height: 75, color: '#8b5cf6' },
      { id: 'node-dedup', type: 'cache', label: 'Redis Idempotency Store', subtitle: 'Duplicate Event Filter (24h TTL)', x: 520, y: 70, width: 180, height: 75, color: '#f59e0b' },
      { id: 'node-ingest', type: 'backendService', label: 'Ingestion Service', subtitle: 'Priority Router & Enricher', x: 520, y: 180, width: 180, height: 75, color: '#10b981' },
      { id: 'node-kafka', type: 'messageQueue', label: 'Kafka Event Bus', subtitle: 'Topics: otp, push, email, sms', x: 740, y: 180, width: 180, height: 75, color: '#ec4899' },
      { id: 'node-w-push', type: 'backendService', label: 'Push Notification Worker', subtitle: 'FCM & APNs Integration', x: 960, y: 80, width: 180, height: 75, color: '#06b6d4' },
      { id: 'node-w-sms', type: 'backendService', label: 'SMS Gateway Worker', subtitle: 'Twilio Multi-region failover', x: 960, y: 190, width: 180, height: 75, color: '#06b6d4' },
      { id: 'node-w-email', type: 'backendService', label: 'Email Dispatch Worker', subtitle: 'SendGrid & Amazon SES', x: 960, y: 300, width: 180, height: 75, color: '#06b6d4' },
      { id: 'node-db', type: 'database', label: 'Notification Database', subtitle: 'Audit Logs & Preferences', x: 1180, y: 190, width: 180, height: 75, color: '#6366f1' }
    ],
    starterEdges: [
      { id: 'edge-1', from: 'node-services', to: 'node-gw', label: 'Trigger Event' },
      { id: 'edge-2', from: 'node-gw', to: 'node-ingest', label: 'Validated Payload' },
      { id: 'edge-3', from: 'node-ingest', to: 'node-dedup', label: 'Check Idempotency' },
      { id: 'edge-4', from: 'node-ingest', to: 'node-kafka', label: 'Publish to Topics' },
      { id: 'edge-5', from: 'node-kafka', to: 'node-w-push', label: 'topic: push' },
      { id: 'edge-6', from: 'node-kafka', to: 'node-w-sms', label: 'topic: sms' },
      { id: 'edge-7', from: 'node-kafka', to: 'node-w-email', label: 'topic: email' },
      { id: 'edge-8', from: 'node-w-sms', to: 'node-db', label: 'Log Delivery' }
    ]
  },
  {
    id: 'chat-system',
    title: 'Design Real-time 1-on-1 and Group Chat (WhatsApp)',
    scale: '50M daily active users • WebSocket connections',
    readWriteRatio: 'Bidirectional low latency',
    description: 'Design a distributed real-time messaging architecture supporting persistent WebSocket connections, presence indicators, message sequencing, delivery receipts, and group broadcast.',
    requirements: [
      'Low latency (<100ms) 1-on-1 and group chat with persistent WebSocket connections.',
      'Online/offline presence tracking and last-seen timestamps.',
      'Message delivery status: Sent, Delivered, and Read receipts.',
      'Multi-device synchronization and offline push notification fallback.'
    ],
    calculations: [
      'Daily Active Users: 50M users sending 40 messages/day = 2B messages/day',
      'Concurrent Connections: ~10M active simultaneous WebSocket sessions',
      'Average QPS: ~24,000 msgs/sec (Peak: 50,000 msgs/sec)',
      'Storage: 2B msgs × 100 bytes = ~200 GB/day (Cassandra distributed store)',
      'Presence RAM: 50M users × 64 bytes = ~3.2 GB Redis cluster'
    ],
    recommendedTopology: [
      { name: 'WebSocket Gateways', role: 'Stateful Connection Handlers', type: 'apiGateway' },
      { name: 'User Presence Service', role: 'Heartbeat & Online Status', type: 'backendService' },
      { name: 'Redis Presence Cluster', role: 'Active Gateway Connection Map', type: 'cache' },
      { name: 'Cassandra DB', role: 'High-Volume Append-Only Messages', type: 'database' }
    ],
    starterNodes: [
      { id: 'node-mobile', type: 'client', label: 'Mobile Apps (iOS/Android)', subtitle: 'Persistent TCP / WebSocket', x: 80, y: 140, width: 180, height: 75, color: '#3b82f6' },
      { id: 'node-web', type: 'client', label: 'Web Chat App', subtitle: 'WSS Secure WebSocket', x: 80, y: 270, width: 180, height: 75, color: '#3b82f6' },
      { id: 'node-nlb', type: 'loadBalancer', label: 'Layer 4 NLB', subtitle: 'TLS Termination & IP Hash', x: 300, y: 200, width: 170, height: 75, color: '#6366f1' },
      { id: 'node-ws-gw', type: 'apiGateway', label: 'WebSocket Gateways', subtitle: 'Active Connection Fleet', x: 510, y: 200, width: 180, height: 75, color: '#8b5cf6' },
      { id: 'node-presence', type: 'backendService', label: 'Presence Service', subtitle: 'Heartbeat & Online State', x: 730, y: 90, width: 180, height: 75, color: '#10b981' },
      { id: 'node-router', type: 'backendService', label: 'Message Router Service', subtitle: 'Channel & Recipient Router', x: 730, y: 230, width: 180, height: 75, color: '#10b981' },
      { id: 'node-redis', type: 'cache', label: 'Redis Cluster', subtitle: 'User -> WS Server Map', x: 950, y: 90, width: 180, height: 75, color: '#f59e0b' },
      { id: 'node-kafka', type: 'messageQueue', label: 'Kafka Message Bus', subtitle: 'Message Fanout & Push Events', x: 950, y: 230, width: 180, height: 75, color: '#ec4899' },
      { id: 'node-cassandra', type: 'database', label: 'Cassandra Cluster', subtitle: 'Partitioned Chat History', x: 1170, y: 230, width: 180, height: 75, color: '#06b6d4' },
      { id: 'node-s3', type: 'storage', label: 'Amazon S3 Object Store', subtitle: 'Encrypted Media & Voice Notes', x: 1170, y: 350, width: 180, height: 75, color: '#a855f7' }
    ],
    starterEdges: [
      { id: 'edge-1', from: 'node-mobile', to: 'node-nlb', label: 'WSS Connect' },
      { id: 'edge-2', from: 'node-web', to: 'node-nlb', label: 'WSS Connect' },
      { id: 'edge-3', from: 'node-nlb', to: 'node-ws-gw', label: 'Balanced Socket' },
      { id: 'edge-4', from: 'node-ws-gw', to: 'node-presence', label: 'Heartbeat (30s)' },
      { id: 'edge-5', from: 'node-ws-gw', to: 'node-router', label: 'Send Message' },
      { id: 'edge-6', from: 'node-presence', to: 'node-redis', label: 'Set Online TTL' },
      { id: 'edge-7', from: 'node-router', to: 'node-redis', label: 'Lookup Target GW' },
      { id: 'edge-8', from: 'node-router', to: 'node-kafka', label: 'Async Publish' },
      { id: 'edge-9', from: 'node-router', to: 'node-cassandra', label: 'Persist History' }
    ]
  }
];

export const NODE_TYPES = [
  { type: 'client', label: 'Client Device', defaultSubtitle: 'Web, Mobile, IoT', color: '#3b82f6', bgLight: '#eff6ff', bgDark: '#172554' },
  { type: 'loadBalancer', label: 'Load Balancer', defaultSubtitle: 'NGINX / ALB / Round-Robin', color: '#6366f1', bgLight: '#eef2ff', bgDark: '#1e1b4b' },
  { type: 'apiGateway', label: 'API Gateway', defaultSubtitle: 'Rate Limiting & Auth', color: '#8b5cf6', bgLight: '#f5f3ff', bgDark: '#2e1065' },
  { type: 'backendService', label: 'Backend Service', defaultSubtitle: 'Microservice / App Server', color: '#10b981', bgLight: '#ecfdf5', bgDark: '#064e3b' },
  { type: 'database', label: 'Database Cluster', defaultSubtitle: 'PostgreSQL / MongoDB / Cassandra', color: '#ec4899', bgLight: '#fdf2f8', bgDark: '#500724' },
  { type: 'cache', label: 'In-Memory Cache', defaultSubtitle: 'Redis / Memcached', color: '#f59e0b', bgLight: '#fffbeb', bgDark: '#451a03' },
  { type: 'messageQueue', label: 'Message Queue', defaultSubtitle: 'Apache Kafka / RabbitMQ', color: '#d946ef', bgLight: '#fdf4ff', bgDark: '#4a044e' },
  { type: 'cdn', label: 'CDN Edge Server', defaultSubtitle: 'Cloudflare / CloudFront', color: '#06b6d4', bgLight: '#ecfeff', bgDark: '#083344' },
  { type: 'storage', label: 'Object Storage', defaultSubtitle: 'Amazon S3 / Blob Storage', color: '#a855f7', bgLight: '#faf5ff', bgDark: '#3b0764' },
  { type: 'annotation', label: 'Note / Annotation', defaultSubtitle: 'Architecture Justification', color: '#64748b', bgLight: '#f8fafc', bgDark: '#0f172a' }
];

export function getProblemById(id) {
  return SYSTEM_DESIGN_PROBLEMS.find((p) => p.id === id) || SYSTEM_DESIGN_PROBLEMS[0];
}
