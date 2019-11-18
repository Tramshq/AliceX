/**
 * @format
 */

import _ from 'lodash';
import firebaseService from "../../../src/Apps/CheezeWizards/Services/Firebase/FirebaseService";

import wizards from './data/wizards.data';

const owner1 = '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2';
const owner2 = '0xA1b02d8c67b0FDCF4E379855868DeB470E169401';

const network = 'rinkeby';

async function getUpsertedWizards(network, upsertedWizardIds) {
    const allWizards = await firebaseService.getAllWizards(network);
    return _.sortBy(
        allWizards.filter(wizard => _.includes(upsertedWizardIds, wizard.id)),
        wizard => wizard.id
    );
}

describe('retrieve wizards', () => {
    test('Can retrieve all wizards', async () => {

        // add a wizard
        await firebaseService.upsertWizards(network, [{
            affinity: 3,
            ascending: false,
            ascensionOpponent: 0,
            id: '6217',
            maxPower: 125038910370365,
            molded: false,
            nonce: 0,
            owner: '0xA1b02d8c67b0FDCF4E379855868DeB470E169cfB',
            power: 125038910370365,
            online: true,
            ready: true
        }]);

        // Check the wizards have been upserted
        let allWizards = await firebaseService.getAllWizards(network);
        expect(allWizards.length).toBeGreaterThan(0);
        expect(allWizards.filter(wizard => wizard.id === '6217').length).toBe(1);
    });

    test('throws error if network is wrong', async () => {
        try {
            await firebaseService.getAllWizards('tron');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe('Not a valid network tron');
        }
    });
});


test('Can upsert online wizards with idempotentency', async () => {

    // Upsert the test data
    const wizardsToUpsert = _.sortBy(wizards, wizard => wizard.id);
    await firebaseService.upsertWizards(network, wizardsToUpsert);

    const upsertedWizardIds = wizardsToUpsert.map(wizard => wizard.id);

    // Check the wizards have been upserted
    let upsertedWizards = await getUpsertedWizards(network, upsertedWizardIds);
    expect(upsertedWizards).toStrictEqual(wizardsToUpsert);
    expect(upsertedWizards.length).toBe(wizardsToUpsert.length);

    // Check upsert is an idempotent operation
    await firebaseService.upsertWizards(network, wizardsToUpsert);
    upsertedWizards = await getUpsertedWizards(network, upsertedWizardIds);
    expect(upsertedWizards).toStrictEqual(wizardsToUpsert);
    expect(upsertedWizards.length).toBe(wizardsToUpsert.length);
});

test("Can update wizard's online status", async () => {

    // Ensure the firestore has test data
    await firebaseService.upsertWizards(network, wizards);

    // Pick a wizard and assert it's currently online
    const wizard = Object.assign({}, wizards[0]);
    expect(wizard.online).toBe(true);

    const currentOnlineWizards = await firebaseService.getOnlineWizards(network);
    expect(currentOnlineWizards.filter(onlineWizard => onlineWizard.id === wizard.id).length).toBe(1);

    // Update the wizard
    wizard.online = false;
    const wizardsToUpsert = [
        {
            id: wizard.id,
            online: wizard.online
        }
    ];
    await firebaseService.upsertWizards(network, wizardsToUpsert);

    // Check the updated wizard is not returned as part of the online wizards
    const newOnlineWizards = await firebaseService.getOnlineWizards(network);
    expect(currentOnlineWizards.length - newOnlineWizards.length).toBe(1);
    expect(newOnlineWizards.filter(onlineWizard => onlineWizard.id === wizard.id).length).toBe(0);
});

test("Can take all of an owner's wizards offline", async () => {
    // Ensure the firestore has test data
    await firebaseService.upsertWizards(network, wizards);

    // Get all wizards of an owner
    let ownedWizards = await firebaseService.getWizardsByOwner(network, owner1);
    expect(ownedWizards.length).toBe(2);

    const allWizardsOnline = ownedWizards.map(wizard => wizard.online).reduce((t, n) => t && n);
    expect(allWizardsOnline).toBe(true);

    // Take them offline
    const offlineWizardsToUpsert = ownedWizards.map(wizard => ({id: wizard.id, online: false}));
    await firebaseService.upsertWizards(network, offlineWizardsToUpsert);

    ownedWizards = await firebaseService.getWizardsByOwner(network, owner1);
    const allWizardsOffline = ownedWizards.map(wizard => wizard.online).reduce((t, n) => n === false && t === n);
    expect(allWizardsOffline).toBe(true);
});

test.only("Can issue a challenge successfully", async () => {
    // Ensure the firestore has test data
    await firebaseService.upsertWizards(network, wizards);

    // Issue a challenge
    const challengeId = '_mXpQaaF';
    const challengingWizardId = '293';
    const otherWizardId = '6208';
    await firebaseService.sendChallenge(network, {
        challengeId,
        challengingWizardId,
        otherWizardId,
    });

    // Check challenge was recorded correctly
    const challengeesChallenges = await firebaseService.getChallengesByWizard(network, otherWizardId);
    expect(challengeesChallenges.length).toBe(1);

    const receivedChallenge = challengeesChallenges[0];
    expect(receivedChallenge.challengingWizardId).toBe(challengingWizardId);
    expect(receivedChallenge.challengeId).toBe(challengeId);
    expect(receivedChallenge.challengeAccepted).toBe(false);

    const challengersChallenges = await firebaseService.getChallengesByWizard(network, challengingWizardId);
    expect(challengersChallenges.length).toBe(1);

    const issuedChallenge = challengersChallenges[0];
    expect(issuedChallenge.otherWizardId).toBe(otherWizardId);
    expect(issuedChallenge.challengeId).toBe(challengeId);
    expect(issuedChallenge.challengeAccepted).toBe(false);
});

// test("Can accept a challenge successfull", async () => {
//
// });

