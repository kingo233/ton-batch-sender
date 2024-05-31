import { toNano, Cell, Address} from '@ton/core';
import { deployments } from '../utils/deployments';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import participants from '../superlast.json';
import { BatchSender } from '../wrappers/BatchSender';


export async function run(provider: NetworkProvider) {
    const user = provider.sender().address;
    if (!user) {
        throw new Error('Admin address is not specified');
    }
    const batchSenderDeployments = await deployments.read('BatchSender', provider.network());
    const jettonContract = provider.open(JettonMinter.createFromAddress(Address.parse("EQALDH7Qy0Sy9eblP0n-2jdgGzVTCCs2MrXJ471F-sp1ppfr")));

    const jettoWalletAddress = await jettonContract.getWalletAddress(user);
    const jettonWallet = provider.open(JettonWallet.createFromAddress(jettoWalletAddress));

    // 遍历participants，取出里面的值放到messages里面
    let messages = [];
    for(let i = 0;i < participants.length;i++){
        messages.push({
            to: Address.parse(participants[i].address),
            amount: toNano(participants[i].sum)
        });
    }
    // console.log(messages);
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
}