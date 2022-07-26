const { Registry } = require('@cosmjs/proto-signing');
const { TextProposal } = require('cosmjs-types/cosmos/gov/v1beta1/gov');
const { ParameterChangeProposal } = require('cosmjs-types/cosmos/params/v1beta1/params');
const { CommunityPoolSpendProposal } = require('cosmjs-types/cosmos/distribution/v1beta1/distribution');
const { SoftwareUpgradeProposal, CancelSoftwareUpgradeProposal } = require('cosmjs-types/cosmos/upgrade/v1beta1/upgrade');
const { GenericAuthorization } = require('cosmjs-types/cosmos/authz/v1beta1/authz');
const { SendAuthorization } = require('cosmjs-types/cosmos/bank/v1beta1/authz');
const { StakeAuthorization } = require('cosmjs-types/cosmos/staking/v1beta1/authz');
const { BasicAllowance, PeriodicAllowance, AllowedMsgAllowance } = require('cosmjs-types/cosmos/feegrant/v1beta1/feegrant');
const { registryTypes: originalRegistryTypes } = require('@likecoin/iscn-js/dist/messages/registry');

const registryTypes = [
  ...originalRegistryTypes,
  ['/cosmos.gov.v1beta1.TextProposal', TextProposal],
  ['/cosmos.params.v1beta1.ParameterChangeProposal', ParameterChangeProposal],
  ['/cosmos.distribution.v1beta1.CommunityPoolSpendProposal', CommunityPoolSpendProposal],
  ['/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal', SoftwareUpgradeProposal],
  ['/cosmos.upgrade.v1beta1.CancelSoftwareUpgradeProposal', CancelSoftwareUpgradeProposal],
  ['/cosmos.authz.v1beta1.GenericAuthorization', GenericAuthorization],
  ['/cosmos.bank.v1beta1.SendAuthorization', SendAuthorization],
  ['/cosmos.staking.v1beta1.StakeAuthorization', StakeAuthorization],
  ['/cosmos.feegrant.v1beta1.BasicAllowance', BasicAllowance],
  ['/cosmos.feegrant.v1beta1.PeriodicAllowance', PeriodicAllowance],
  ['/cosmos.feegrant.v1beta1.AllowedMsgAllowance', AllowedMsgAllowance],
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
