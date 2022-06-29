const http = require('http');
const https = require('https');

const { method, abciQuery } = require('./matcher.js');

module.exports = {
  listenAddr: {
    port: 8080,
    hostname: '0.0.0.0',
  },
  // axiosOptions are the options of the proxy request
  axiosOptions: {
    timeout: 60000, // 60s
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
  },
  rpcEndpoint: 'http://localhost:26657/',
  redisConfig: {
    url: 'redis://localhost:6379',
  },
  cacheMatchers: [ 
    // negative number means blacklist
    method('broadcast_tx', -1),
    method('broadcast_tx_sync', -1),
    method('broadcast_tx_async', -1),
    method('broadcast_tx_commit', -1),
    method('check_tx', -1),
    method('subscribe', -1),
    method('unsubscribe', -1),
    method('unsubscribe_all', -1),
    method('dial_seeds', -1),
    method('dial_peers', -1),
    method('unsafe_flush_mempool', -1),
    method('remove_tx', -1),

    // RPC methods
    method('block_by_hash', 3600),
    method('consensus_params', 3600),
    method('genesis', 3600),
    method('genesis_chunked', 3600),
    method('tx', 3600),
    method('validators', 3600),
    method('block', (jsonRpcRequest) => {
      const height = jsonRpcRequest.params.height;
      if (!height || height === '0') {
        // don't match with this matcher, fallback to the default
        return 0;
      }
      return 3600;
    }),

    // ABCI queries
    abciQuery('/cosmos.auth.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.authz.v1beta1.Query/GranteeGrants', 60),
    abciQuery('/cosmos.authz.v1beta1.Query/GranterGrants', 60),
    abciQuery('/cosmos.authz.v1beta1.Query/Grants', 60),
    abciQuery('/cosmos.bank.v1beta1.Query/DenomMetadata', 3600),
    abciQuery('/cosmos.bank.v1beta1.Query/DenomsMetadata', 3600),
    abciQuery('/cosmos.bank.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.base.tendermint.v1beta1.Service/GetBlockByHeight', 3600),
    abciQuery('/cosmos.base.tendermint.v1beta1.Service/GetValidatorSetByHeight', 3600),
    abciQuery('/cosmos.distribution.v1beta1.Query/DelegatorValidators', 60),
    abciQuery('/cosmos.distribution.v1beta1.Query/DelegatorWithdrawAddress', 3600),
    abciQuery('/cosmos.distribution.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.distribution.v1beta1.Query/ValidatorSlashes', 60),
    abciQuery('/cosmos.evidence.v1beta1.Query/AllEvidence', 60),
    abciQuery('/cosmos.evidence.v1beta1.Query/Evidence', 60),
    abciQuery('/cosmos.feegrant.v1beta1.Query/Allowance', 60),
    abciQuery('/cosmos.feegrant.v1beta1.Query/Allowances', 60),
    abciQuery('/cosmos.feegrant.v1beta1.Query/AllowancesByGranter', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/Deposit', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/Deposits', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.gov.v1beta1.Query/Proposal', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/Proposals', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/TallyResult', 3600),
    abciQuery('/cosmos.gov.v1beta1.Query/Vote', 60),
    abciQuery('/cosmos.gov.v1beta1.Query/Votes', 60),
    abciQuery('/cosmos.mint.v1beta1.Query/AnnualProvisions', 60),
    abciQuery('/cosmos.mint.v1beta1.Query/Inflation', 60),
    abciQuery('/cosmos.mint.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.params.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.slashing.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.slashing.v1beta1.Query/SigningInfo', 60),
    abciQuery('/cosmos.slashing.v1beta1.Query/SigningInfos', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/Delegation', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/DelegatorDelegations', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/DelegatorUnbondingDelegations', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/DelegatorValidator', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/DelegatorValidators', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/HistoricalInfo', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/Params', 3600),
    abciQuery('/cosmos.staking.v1beta1.Query/Redelegations', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/UnbondingDelegation', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/Validator', 60),
    abciQuery('/cosmos.staking.v1beta1.Query/Validators', 60),
    abciQuery('/cosmos.upgrade.v1beta1.Query/AppliedPlan', 600),
    abciQuery('/cosmos.upgrade.v1beta1.Query/CurrentPlan', 600),
    abciQuery('/cosmos.upgrade.v1beta1.Query/ModuleVersions', 600),
    abciQuery('/cosmos.upgrade.v1beta1.Query/UpgradedConsensusState', 600),
    abciQuery('/likechain.iscn.Query/GetCid', 3600),
    abciQuery('/likechain.iscn.Query/GetCidSize', 3600),
    abciQuery('/likechain.iscn.Query/Params', 3600),
    abciQuery('/likechain.iscn.Query/RecordsByFingerprint', 60),
    // TODO: parse ISCN ID and cache longer if requested version !== 0
    abciQuery('/likechain.iscn.Query/RecordsById', 60),
    abciQuery('/likechain.iscn.Query/RecordsByOwner', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/Balance', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/Class', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/Classes', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/NFT', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/NFTs', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/Owner', 60),
    abciQuery('/cosmos.nft.v1beta1.Query/Supply', 60),
    abciQuery('/likechain.likenft.Query/AccountByClass', 60),
    abciQuery('/likechain.likenft.Query/ClassesByAccount', 60),
    abciQuery('/likechain.likenft.Query/ClassesByAccountIndex', 60),
    abciQuery('/likechain.likenft.Query/ClassesByISCN', 60),
    abciQuery('/likechain.likenft.Query/ClassesByISCNIndex', 60),
    abciQuery('/likechain.likenft.Query/ISCNByClass', 60),
    abciQuery('/likechain.likenft.Query/Listing', 60),
    abciQuery('/likechain.likenft.Query/ListingIndex', 60),
    abciQuery('/likechain.likenft.Query/ListingsByClass', 60),
    abciQuery('/likechain.likenft.Query/ListingsByNFT', 60),
    abciQuery('/likechain.likenft.Query/MintableNFT', 60),
    abciQuery('/likechain.likenft.Query/MintableNFTIndex', 60),
    abciQuery('/likechain.likenft.Query/MintableNFTs', 60),
    abciQuery('/likechain.likenft.Query/Offer', 60),
    abciQuery('/likechain.likenft.Query/OfferIndex', 60),
    abciQuery('/likechain.likenft.Query/OffersByClass', 60),
    abciQuery('/likechain.likenft.Query/OffersByNFT', 60),
    abciQuery('/likechain.likenft.Query/Params', 60),
    abciQuery('/likechain.likenft.Query/RoyaltyConfig', 60),
    abciQuery('/likechain.likenft.Query/RoyaltyConfigIndex', 60),

    // default
    10,
  ],
};
