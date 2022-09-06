const { Registry } = require('@cosmjs/proto-signing');
const { TextProposal } = require('cosmjs-types/cosmos/gov/v1beta1/gov');
const { ParameterChangeProposal } = require('cosmjs-types/cosmos/params/v1beta1/params');
const { CommunityPoolSpendProposal } = require('cosmjs-types/cosmos/distribution/v1beta1/distribution');
const { SoftwareUpgradeProposal, CancelSoftwareUpgradeProposal } = require('cosmjs-types/cosmos/upgrade/v1beta1/upgrade');
const { ClientUpdateProposal } = require('cosmjs-types/ibc/core/client/v1/client');
const { GenericAuthorization } = require('cosmjs-types/cosmos/authz/v1beta1/authz');
const { SendAuthorization } = require('cosmjs-types/cosmos/bank/v1beta1/authz');
const { StakeAuthorization } = require('cosmjs-types/cosmos/staking/v1beta1/authz');
const { BasicAllowance, PeriodicAllowance, AllowedMsgAllowance } = require('cosmjs-types/cosmos/feegrant/v1beta1/feegrant');
const { registryTypes: originalRegistryTypes } = require('@likecoin/iscn-js/dist/messages/registry');
const { PubKey: Secp256k1PubKey } = require('cosmjs-types/cosmos/crypto/secp256k1/keys');
const { PubKey: Ed25519PubKey } = require('cosmjs-types/cosmos/crypto/ed25519/keys');
const { LegacyAminoPubKey } = require('cosmjs-types/cosmos/crypto/multisig/keys');

const registryTypes = [
  ...originalRegistryTypes,
  ['/cosmos.gov.v1beta1.TextProposal', TextProposal],
  ['/cosmos.params.v1beta1.ParameterChangeProposal', ParameterChangeProposal],
  ['/cosmos.distribution.v1beta1.CommunityPoolSpendProposal', CommunityPoolSpendProposal],
  ['/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal', SoftwareUpgradeProposal],
  ['/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal', CancelSoftwareUpgradeProposal],
  ['/ibc.core.client.v1.ClientUpdateProposal', ClientUpdateProposal],
  ['/cosmos.authz.v1beta1.GenericAuthorization', GenericAuthorization],
  ['/cosmos.bank.v1beta1.SendAuthorization', SendAuthorization],
  ['/cosmos.staking.v1beta1.StakeAuthorization', StakeAuthorization],
  ['/cosmos.feegrant.v1beta1.BasicAllowance', BasicAllowance],
  ['/cosmos.feegrant.v1beta1.PeriodicAllowance', PeriodicAllowance],
  ['/cosmos.feegrant.v1beta1.AllowedMsgAllowance', AllowedMsgAllowance],
  ['/cosmos.crypto.secp256k1.PubKey', Secp256k1PubKey],
  ['/cosmos.crypto.ed25519.PubKey', Ed25519PubKey],
  ['/cosmos.crypto.multisig.LegacyAminoPubKey', LegacyAminoPubKey],
];

const messageRegistryMap = registryTypes
  .reduce((acc, cur) => {
    const [key, value] = cur;
    acc[key] = value;
    return acc;
  }, {});

const messageRegistry = new Registry(registryTypes);

module.exports = {
  messageRegistryMap,
  messageRegistry,
};
