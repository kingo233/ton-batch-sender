import { toNano, Cell, Address} from '@ton/core';
import { deployments } from '../utils/deployments';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import participants from '../superlast.json';
import { BatchSender } from '../wrappers/BatchSender';
import { min } from 'lodash';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function run(provider: NetworkProvider) {
    const user = provider.sender().address;
    if (!user) {
        throw new Error('Admin address is not specified');
    }
    const batchSenderDeployments = await deployments.read('BatchSender', provider.network());
    // jettonContract
    const jettonContract = provider.open(JettonMinter.createFromAddress(Address.parse("EQDdCha_K-Z97lKl599O0GDAt0py2ZUuons4Wuf85tq6NXIO")));

    const jettoWalletAddress = await jettonContract.getWalletAddress(user);
    const jettonWallet = provider.open(JettonWallet.createFromAddress(jettoWalletAddress));

    // 遍历participants，取出里面的值放到messages里面
    const MAX_BATCH_SIZE = 200;
    let start = 0;
    // end是MAX_BATCH_SIZE和length中最小的那个
    let end:number = min([MAX_BATCH_SIZE, participants.length]) as number
    // start = 0;
    // end = 4000;
    // TEST,把participants里面的数据改成1000个i
    // const participants = Array.from({ length: 1000 }, (_, i) => ({
    //     address: `${i}`,
    //     sum: 1000n,
    // }));


    while (start < participants.length) {
        console.log('airdrop from ' + start + ' to ' + end);
        const batch = participants.slice(start, end);
        const messages = [];

        for (let i = 0; i < batch.length; i++) {
            messages.push({
                to: Address.parse(batch[i].address),
                amount: toNano(BigInt(batch[i].sum))
            });
        }
        console.log(batch.slice(0,10));

        const expectedRequiredGas = toNano(0.05) * BigInt(messages.length);
        const expectedServiceFee = toNano(1);
        const totalJettonAmount = messages.reduce((acc, m) => acc + m.amount, 0n);
        const tx = await jettonWallet.sendTransfer(provider.sender(), toNano(2) + expectedRequiredGas + expectedServiceFee, {
            jettonAmount: totalJettonAmount,
            to: batchSenderDeployments.address,
            responseAddress: user,
            customPayload: Cell.EMPTY,
            forwardTonAmount: toNano(1) + expectedRequiredGas + expectedServiceFee,
            forwardPayload: BatchSender.buildSendPayload(messages),
        });

        start = end;
        end += MAX_BATCH_SIZE;
        if (end > participants.length) {
            end = participants.length;
        }
        await sleep(1000 * 90);
    }
}