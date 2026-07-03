import React, { useState, useEffect } from 'react';

interface OracleNode {
  id: number;
  address: string;
  status: 'online' | 'offline';
  latency: number;
  hasSigned: boolean;
}

interface BLSAggregationStatus {
  aggregatedSignature: string | null;
  thresholdMet: boolean;
}

const OracleConsensus: React.FC = () => {
  const [oracleNodes, setOracleNodes] = useState<OracleNode[]>([]);
  const [blsAggregationStatus, setBLSAggregationStatus] = useState<BLSAggregationStatus>({
    aggregatedSignature: null,
    thresholdMet: false,
  });
  const [signaturesCollected, setSignaturesCollected] = useState(0);
  const [threshold, setThreshold] = useState(3);

  useEffect(() => {
    const fetchOracleNodes = async () => {
      // Mock data for demo mode
      const nodes: OracleNode[] = [
        { id: 1, address: '01abc...', status: 'online', latency: 100, hasSigned: false },
        { id: 2, address: '02def...', status: 'online', latency: 200, hasSigned: false },
        { id: 3, address: '03ghi...', status: 'online', latency: 300, hasSigned: false },
        { id: 4, address: '04jkl...', status: 'offline', latency: 0, hasSigned: false },
        { id: 5, address: '05mno...', status: 'online', latency: 400, hasSigned: false },
      ];

      setOracleNodes(nodes);
      setSignaturesCollected(0);

      // Simulate signature collection
      const signedNodes = nodes.filter((node) => node.hasSigned);
      setSignaturesCollected(signedNodes.length);

      // Check if threshold is met
      if (signedNodes.length >= threshold) {
        setBLSAggregationStatus({
          aggregatedSignature: '0x1234567890abcdef',
          thresholdMet: true,
        });
      } else {
        setBLSAggregationStatus({
          aggregatedSignature: null,
          thresholdMet: false,
        });
      }
    };

    fetchOracleNodes();

    const intervalId = setInterval(fetchOracleNodes, 5000);

    return () => clearInterval(intervalId);
  }, [threshold]);

  const handleNodeStatusChange = (id: number, status: 'online' | 'offline') => {
    const updatedNodes = oracleNodes.map((node) => {
      if (node.id === id) {
        return { ...node, status };
      }
      return node;
    });

    setOracleNodes(updatedNodes);
  };

  const handleNodeSignatureChange = (id: number, hasSigned: boolean) => {
    const updatedNodes = oracleNodes.map((node) => {
      if (node.id === id) {
        return { ...node, hasSigned };
      }
      return node;
    });

    setOracleNodes(updatedNodes);
    setSignaturesCollected(updatedNodes.filter((node) => node.hasSigned).length);
  };

  return (
    <div style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
      <h2 style={{ color: '#0097a7' }}>Oracle Consensus</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Address</th>
            <th>Status</th>
            <th>Latency (ms)</th>
            <th>Has Signed</th>
          </tr>
        </thead>
        <tbody>
          {oracleNodes.map((node) => (
            <tr key={node.id}>
              <td>{node.id}</td>
              <td>{node.address}</td>
              <td>
                <span
                  style={{
                    backgroundColor: node.status === 'online' ? '#34c759' : '#ff3737',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    display: 'inline-block',
                    marginRight: 5,
                  }}
                />
                {node.status}
              </td>
              <td>{node.latency}</td>
              <td>
                <input
                  type="checkbox"
                  checked={node.hasSigned}
                  onChange={(e) => handleNodeSignatureChange(node.id, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: '#0097a7' }}>Progress Bar</h3>
        <div
          style={{
            width: '100%',
            height: 20,
            backgroundColor: '#ccc',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(signaturesCollected / threshold) * 100}%`,
              height: 20,
              backgroundColor: '#34c759',
              transition: 'width 0.5s',
            }}
          />
        </div>
        <p style={{ fontSize: 14, color: '#666' }}>
          {signaturesCollected} out of {threshold} signatures collected
        </p>
      </div>
      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: '#0097a7' }}>BLS Aggregation Status</h3>
        {blsAggregationStatus.thresholdMet ? (
          <p style={{ fontSize: 14, color: '#34c759' }}>
            Aggregated signature: {blsAggregationStatus.aggregatedSignature}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: '#ff3737' }}>Threshold not met</p>
        )}
      </div>
    </div>
  );
};

export default OracleConsensus;
