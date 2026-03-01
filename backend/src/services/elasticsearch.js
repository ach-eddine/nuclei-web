import { Client } from '@elastic/elasticsearch';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const ES_INDEX = process.env.ES_INDEX || 'nuclei';

const client = new Client({ node: ES_NODE });

export async function checkHealth() {
  try {
    const health = await client.cluster.health();
    return { status: health.status, numberOfNodes: health.number_of_nodes };
  } catch (err) {
    return { status: 'unavailable', error: err.message };
  }
}

export async function getSummary(target) {
  try {
    const query = target
      ? { bool: { must: [{ term: { 'event.host.keyword': target } }] } }
      : { match_all: {} };

    const result = await client.search({
      index: ES_INDEX,
      size: 0,
      query,
      aggs: {
        severity_counts: {
          terms: { field: 'event.info.severity.keyword', size: 10 },
        },
        targets: {
          terms: { field: 'event.host.keyword', size: 100 },
        },
      },
    });
    const total = result.hits.total.value;
    const sevBuckets = result.aggregations.severity_counts.buckets;
    const severities = {};
    sevBuckets.forEach((b) => {
      severities[b.key] = b.doc_count;
    });
    const targets = result.aggregations.targets.buckets.map((b) => ({
      host: b.key,
      count: b.doc_count,
    }));
    return { total, severities, targets };
  } catch (err) {
    return { total: 0, severities: {}, targets: [] };
  }
}

export async function searchResults({ query, page = 1, size = 50, severity, target }) {
  try {
    const must = [];
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: [
            'event.template-id',
            'event.host',
            'event.info.name',
            'event.info.description',
          ],
        },
      });
    }
    if (severity) {
      must.push({ term: { 'event.info.severity.keyword': severity } });
    }
    if (target) {
      must.push({ term: { 'event.host.keyword': target } });
    }

    const result = await client.search({
      index: ES_INDEX,
      from: (page - 1) * size,
      size,
      sort: [{ '@timestamp': 'desc' }],
      query: must.length ? { bool: { must } } : { match_all: {} },
    });

    return {
      total: result.hits.total.value,
      hits: result.hits.hits.map((h) => ({
        id: h._id,
        ...h._source.event,
        '@timestamp': h._source['@timestamp'],
      })),
    };
  } catch (err) {
    return { total: 0, hits: [] };
  }
}

export async function getResultById(id) {
  const doc = await client.get({ index: ES_INDEX, id });
  const event = doc._source.event || {};
  return {
    id: doc._id,
    _raw: doc._source,
    ...event,
    'extracted-results': event['extracted-results'] || null,
    '@timestamp': doc._source['@timestamp'],
  };
}

export { client, ES_INDEX };
