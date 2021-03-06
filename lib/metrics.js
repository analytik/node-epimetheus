const client = require('prom-client');
const metric = {
  http: {
    requests: {
      total: new client.Counter('http_requests_total', 'total number of http requests', ['method', 'path', 'status']),
      duration: new client.Summary('http_request_duration_milliseconds', 'request duration in milliseconds', ['method', 'path', 'status']),
      satisfied: new client.Counter('http_requests_satisfied_total', 'total number of satisfactory http requests', ['method', 'path', 'status']),
      tolerated: new client.Counter('http_requests_tolerated_total', 'total number of tolerated http requests', ['method', 'path', 'status']),
      frustrated: new client.Counter('http_requests_frustrated_total', 'total number of frustrating http requests', ['method', 'path', 'status'])
    }
  },
  node: {
    lag: new client.Gauge('node_lag_duration_milliseconds', 'the event loop lag in milliseconds'),
    memory: {
      rss: new client.Gauge('node_memory_rss_bytes', 'the resident set size in bytes'),
      heap: {
        total: new client.Gauge('node_memory_heap_total_bytes', 'the V8 heap total in bytes'),
        used: new client.Gauge('node_memory_heap_used_bytes', 'the V8 heap used in bytes')
      }
    }

  }
}

function ms(start) {
  var diff = process.hrtime(start);
  return Math.round((diff[0] * 1e9 + diff[1]) / 1000000);
}

function apdexLevel(duration) {
  var T = 500;
  if(duration <= T) {
    return 'satisfied';
  }
  
  if(duration <= 4*T) {
    return 'tolerated';
  }

  return 'frustrated';
}

function observe(method, path, statusCode, start) {
  var path = path.toLowerCase();
  if (path !== '/metrics' && path !== '/metrics/') {
    var duration = ms(start);
    var method = method.toLowerCase();
    metric.http.requests.total.labels(method, path, statusCode).inc();
    metric.http.requests.duration.labels(method, path, statusCode).observe(start);
    metric.http.requests[apdexLevel(duration)].labels(method, path, statusCode).inc();
  }
};

function observeMemory(rss, heapTotal, heapUsed) {
  metric.node.memory.rss.set(rss);
  metric.node.memory.heap.total.set(heapTotal);
  metric.node.memory.heap.used.set(heapUsed);
};

function observeLag(start, interval) {
  var lag = ms(start) - interval;
  metric.node.lag.set(lag);
};

module.exports = {
  observe: observe,
  observeLag: observeLag,
  observeMemory: observeMemory,
  summary: client.register.metrics
};
