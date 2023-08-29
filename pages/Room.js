import styles from '../styles/Home.module.css';
import { Transaction, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction, PUBLIC_KEY_LENGTH } from '@solana/web3.js';
import bs58 from "bs58";
import { Metaplex, assertAccountExists, walletAdapterIdentity } from "@metaplex-foundation/js";
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { PROGRAM_ADDRESS } from "@metaplex-foundation/mpl-auction-house";
import * as anchor from "@coral-xyz/anchor";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    getAccount,
    getMint
  } from "@solana/spl-token";

export const Escrow = ({ onClusterChange }) => {

    let escrowIdentifier = `escrow-1`;
    let METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    let ESCROW_PROGRAM = new PublicKey("BGXHsoqm7cXC6PfAXcyPNuyNAzUgGs6iushSr2SJCP1v")

    let mintA = new PublicKey('D8J6gcTSLPwXS9h4afZvDEQr2qGxscVfUPnrfbHQxhzJ')
    let mintB = new PublicKey('8n7GxVW3ce7vTJ8BDpuiFBfuJFUEdGcNj4cW6vhDS6qk')
    let mintId = new PublicKey('36KJBG46Ms7daa8MSg2s4z5B1k3YMQn6Xkrg7rX3R8tD')

    const wallet = useWallet();
    let connection = new anchor.web3.Connection(clusterApiUrl('devnet'),{commitment:'confirmed'})
    let provider = new anchor.AnchorProvider(connection, wallet)
    anchor.setProvider(provider);

    // taker will be the game owner , so this won't change and will need keypair
    // but to exchange , this will only use initializers pubkey
    let taker = new Keypair.fromSecretKey(bs58.decode('Bhao6w2hvn5LtBgJ6nAno3qTy6WMyn59k7sdbFdJVsRapumSJfF86hZ1wcWJ6SxuEhuJUwC2DoNu5YTA9DyMFSy'))
    let initializer = new PublicKey('Se9gzT3Ep3E452LPyYaWKYqcCvsAwtHhRQwQvmoXFxG')

    const get_ix = async function() {

        const idl = await anchor.Program.fetchIdl(ESCROW_PROGRAM, provider);
        const program = new anchor.Program(idl, ESCROW_PROGRAM, provider);
        const initializer_mintA = await getOrCreateAssociatedTokenAccount(connection, wallet, mintA, initializer)
        const initializer_mintB = await getOrCreateAssociatedTokenAccount(connection, wallet, mintB, initializer)
        const initializerTokenAccountA = await getAccount(connection, initializer_mintA.address)
        const initializerTokenAccountB = await getAccount(connection, initializer_mintB.address)
        const taker_mintA = await getOrCreateAssociatedTokenAccount(connection, taker, mintA, taker.publicKey)
        const taker_mintB = await getOrCreateAssociatedTokenAccount(connection, taker, mintB, taker.publicKey)
        const takerTokenAccountA = await getAccount(connection, taker_mintA.address)
        const takerTokenAccountB = await getAccount(connection, taker_mintB.address)

        const nftmint = await getMint(connection,mintId)
        const mint_ata = await getOrCreateAssociatedTokenAccount(connection, wallet, mintId, wallet.publicKey)

        const escrowStateId = PublicKey.findProgramAddressSync(
            [
            anchor.utils.bytes.utf8.encode("state"),
            anchor.utils.bytes.utf8.encode(escrowIdentifier)
            ],
            ESCROW_PROGRAM
        )[0];
        const vaultAuthorityId = PublicKey.findProgramAddressSync(
            [anchor.utils.bytes.utf8.encode("authority")],
            ESCROW_PROGRAM
        )[0];
        const vaultKey = PublicKey.findProgramAddressSync(
            [vaultAuthorityId.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintA.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
        const metadataAccount = PublicKey.findProgramAddressSync(
            [
                anchor.utils.bytes.utf8.encode("metadata"),
                METADATA_PROGRAM.toBuffer(),
                nftmint.address.toBuffer(),
            ],
            METADATA_PROGRAM
        )[0];

        return [{
            program,initializerTokenAccountA,initializerTokenAccountB,mint_ata,
            escrowStateId,vaultAuthorityId,vaultKey,metadataAccount,nftmint,
            takerTokenAccountA,takerTokenAccountB
        }]

    }
    const execute_tx = async function (tx, connection, wallet){

        tx.feePayer = wallet.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash

        const latestBlockHash = await connection.getLatestBlockhash();
        const signedtx = await wallet.signTransaction(tx)
        const txid = await connection.sendRawTransaction(signedtx.serialize(),{skipPreflight: false});
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txid
        })

    }

    const checkEligibility = async () => {
        
    };
    

    const Init_Room = async () => {

        const getix = await get_ix()
        
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

        const getix = await get_ix()

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

        const getix = await get_ix()

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
        checkEligibility();
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