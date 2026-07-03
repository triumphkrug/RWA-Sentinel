import React from 'react';
import { FileText, Link, Code, Info } from 'lucide-react';

const CONTRACTS = {
  'asset-registry': 'eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
  'attestation-store': 'bf0ce98af2b24cbae8ce8c13b3dbc4a6b3766a49d0a5f7e3f02746ee77f38c82',
};

const EXPLORER_BASE_URL = 'https://testnet.cspr.live';

const Contracts: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Smart Contracts</h2>
      <p className="text-gray-700">
        The RWA-Sentinel protocol relies on a set of core smart contracts deployed on the Casper blockchain.
        These contracts manage asset registration, attestation storage, and governance mechanisms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(CONTRACTS).map(([name, hash]) => (
          <div key={name} className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FileText className="h-7 w-7 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900 capitalize">{name.replace('-', ' ')} Contract</h3>
            </div>
            <p className="text-gray-700 mb-3">
              <span className="font-medium">Contract Hash:</span> <code className="bg-gray-100 p-1 rounded text-sm">{hash}</code>
            </p>
            <a
              href={`${EXPLORER_BASE_URL}/contract/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View on Casper Explorer <Link className="ml-1 h-4 w-4" />
            </a>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <Code className="h-5 w-5 text-gray-500 mr-2" /> Key Functions
              </h4>
              <ul className="space-y-3 text-gray-700">
                {name === 'asset-registry' && (
                  <>
                    <li>
                      <span className="font-medium">register_asset(asset_id, metadata):</span> Registers a new RWA with its unique ID and associated metadata.
                    </li>
                    <li>
                      <span className="font-medium">get_asset(asset_id):</span> Retrieves the registered details of an asset.
                    </li>
                    <li>
                      <span className="font-medium">update_asset_metadata(asset_id, new_metadata):</span> Updates the metadata for an existing asset.
                    </li>
                  </>
                )}
                {name === 'attestation-store' && (
                  <>
                    <li>
                      <span className="font-medium">mint_attestation(asset_id, score, attestation_hash, expires_at):</span> Mints a new Soulbound Token (SBT) representing an asset's trust score.
                    </li>
                    <li>
                      <span className="font-medium">get_attestation(attestation_hash):</span> Retrieves the details of a specific attestation.
                    </li>
                    <li>
                      <span className="font-medium">revoke_attestation(attestation_hash):</span> Revokes an attestation if it's found to be invalid or challenged.
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex items-start space-x-4">
        <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Contract Interaction</h3>
          <p className="text-gray-700">
            Direct interaction with these contracts (e.g., calling functions) typically requires a Casper-compatible wallet and knowledge of the contract ABIs.
            The RWA-Sentinel backend services handle most of these interactions on behalf of the oracle network.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contracts;
