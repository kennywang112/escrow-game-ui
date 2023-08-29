import styles from '../styles/Home.module.css';
import { Transaction, PublicKey } from '@solana/web3.js';
import bs58 from "bs58";
import { Keypair, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from "@coral-xyz/anchor";
import {
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js"
import { get_ix, execute_tx } from "./utils"

export const Escrow = () => {

    let escrowIdentifier = `escrow-1`;

    let mintA = new PublicKey('D8J6gcTSLPwXS9h4afZvDEQr2qGxscVfUPnrfbHQxhzJ')
    let mintB = new PublicKey('8n7GxVW3ce7vTJ8BDpuiFBfuJFUEdGcNj4cW6vhDS6qk')

    const wallet = useWallet();
    let connection = new anchor.web3.Connection(clusterApiUrl('devnet'),{commitment:'confirmed'})
    let provider = new anchor.AnchorProvider(connection, wallet)
    anchor.setProvider(provider);

    // taker will be the game owner , so this won't change and will need keypair
    // but to exchange , this will only use initializers pubkey
    let taker = new Keypair.fromSecretKey(bs58.decode("Bhao6w2hvn5LtBgJ6nAno3qTy6WMyn59k7sdbFdJVsRapumSJfF86hZ1wcWJ6SxuEhuJUwC2DoNu5YTA9DyMFSy"))
    let initializer = new PublicKey('Se9gzT3Ep3E452LPyYaWKYqcCvsAwtHhRQwQvmoXFxG')
    let holder_nft = [];

    const metaplex = new Metaplex(connection);
    metaplex.use(walletAdapterIdentity(wallet));

    const FindNft = async () => {

        const nfts = await metaplex.nfts().findAllByOwner({owner: wallet.publicKey})

        for (const nft of nfts) {

            if(nft.collection && nft.collection.address == "8E8BHMvZiKq7q9xn1dw8rbZr7Vf2uPUdshaNU5mmFeZ8"){

                holder_nft.push(nft)

            }

        }

        if(holder_nft.length != 0){

            console.log('you are the holder !')

        }else{
            console.log('you are not the holder !')
        }
    }

    const Init_Room = async () => {

        const mintId = holder_nft[0].mintAddress
        const getix = await get_ix(anchor, provider, connection, wallet, wallet.publicKey, taker, escrowIdentifier, mintId)
        
        const tx = new Transaction();
        const ix = await getix[0].program.methods
        .initRoom({
            initializerAmount: new anchor.BN(50),
            takerAmount: new anchor.BN(70),
            identifier: escrowIdentifier,
        })
        .accounts({
            initializer: wallet.publicKey,
            vaultAuthority: getix[0].vaultAuthorityId,
            vault: getix[0].vaultKey,
            nftMint: getix[0].nftmint.address,
            nftTokenAccount: getix[0].mint_ata.address,
            metadataAccount: getix[0].metadataAccount,
            mint: mintA,
            initializerDepositTokenAccount: getix[0].initializerTokenAccountA.address,
            initializerReceiveTokenAccount: getix[0].initializerTokenAccountB.address,
            roomState: getix[0].escrowStateId,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

        tx.add(ix)
        
        console.log(tx)
        await execute_tx(tx, connection, wallet)
        console.log('success')

    }

    const Exchange = async () => {

        // initializer in exchange must not change to wallet.publikey
        const mintId = holder_nft[0].mintAddress
        const getix = await get_ix(anchor, provider, connection, wallet, initializer, taker, escrowIdentifier, mintId)

        const tx = new Transaction();
        const ix = await getix[0].program.methods
        .exchange()
        .accounts({
            taker: wallet.publicKey,
            initializerDepositTokenMint: mintA,
            takerDepositTokenMint: mintB,
            takerDepositTokenAccount: getix[0].takerTokenAccountB.address,
            takerReceiveTokenAccount: getix[0].takerTokenAccountA.address,
            initializerDepositTokenAccount: getix[0].initializerTokenAccountA.address,
            initializerReceiveTokenAccount: getix[0].initializerTokenAccountB.address,
            initializer: initializer,
            roomState: getix[0].escrowStateId,
            vault: getix[0].vaultKey,
            vaultAuthority: getix[0].vaultAuthorityId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

        tx.add(ix)
        
        console.log(tx)
        await execute_tx(tx, connection, wallet)
        console.log('success')
    }

    const Cancel = async () => {

        const mintId = holder_nft[0].mintAddress
        const getix = await get_ix(anchor, provider, connection, wallet, wallet.publicKey, taker, escrowIdentifier, mintId)

        const tx = new Transaction()
        const ix = await getix[0].program.methods
        .cancel()
        .accounts({
          initializer: wallet.publicKey,
          mint: mintA,
          initializerDepositTokenAccount: getix[0].initializerTokenAccountA.address,
          vault: getix[0].vaultKey,
          vaultAuthority: getix[0].vaultAuthorityId,
          roomState: getix[0].escrowStateId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()
        
        tx.add(ix)

        console.log(tx)
        await execute_tx(tx, connection, wallet)
        console.log('success')

    }

    if (!wallet.connected) {
        return null;
    }else {
        FindNft();
    }

    return (
        <div>
            <div className={styles.container}>
                <div className={styles.nftForm}>
                    <button onClick={Init_Room}>Init room</button>
                    <button onClick={Exchange}>Exchange</button>
                    <button onClick={Cancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
}