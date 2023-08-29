import styles from '../styles/Home.module.css';
import { Transaction, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from "bs58";
import { Metaplex, assertAccountExists, walletAdapterIdentity } from "@metaplex-foundation/js";
import { Keypair, Connection, clusterApiUrl,VersionedTransaction } from '@solana/web3.js';
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
    let ESCROW_PROGRAM = new PublicKey("BGXHsoqm7cXC6PfAXcyPNuyNAzUgGs6iushSr2SJCP1v")
    let mintA = new PublicKey('D8J6gcTSLPwXS9h4afZvDEQr2qGxscVfUPnrfbHQxhzJ')
    let mintB = new PublicKey('8n7GxVW3ce7vTJ8BDpuiFBfuJFUEdGcNj4cW6vhDS6qk')
    
    let mintId = new PublicKey('CA2eC4TvjpKG4sAfxxoEr1RSRtdE7p52s9AwXJasbXzF')   
    //let mintId = new PublicKey('GHNBLRuJjQwDNa8fqotndtad13CV8pwYdHMggFQWvwvG')    

    const wallet = useWallet();
    let connection = new anchor.web3.Connection(clusterApiUrl('devnet'),{commitment:'confirmed'})
    let provider = new anchor.AnchorProvider(connection, wallet)
    anchor.setProvider(provider);
    const initializer = Keypair.fromSecretKey(bs58.decode("Bhao6w2hvn5LtBgJ6nAno3qTy6WMyn59k7sdbFdJVsRapumSJfF86hZ1wcWJ6SxuEhuJUwC2DoNu5YTA9DyMFSy"))
    const taker = Keypair.fromSecretKey(bs58.decode("2jgPdKQQE9fqgj8jtj6hESw8z7ibv7b6rQVxpPgxrTjGqyeq61uVcqGbm7JQ7egiD3cwFYbtPcQotyJEX9QbUXdv"))

    const checkEligibility = async () => {

    };

    const Init_Room = async () => {

        const idl = await anchor.Program.fetchIdl(ESCROW_PROGRAM, provider);
        const program = new anchor.Program(idl, ESCROW_PROGRAM, provider);
        const initializer_mintA = await getOrCreateAssociatedTokenAccount(connection, provider.wallet, mintA, provider.wallet.publicKey)
        const initializer_mintB = await getOrCreateAssociatedTokenAccount(connection, provider.wallet, mintB, provider.wallet.publicKey)
        const initializerTokenAccountA = await getAccount(connection, initializer_mintA.address)
        const initializerTokenAccountB = await getAccount(connection, initializer_mintB.address)

        const nftmint = await getMint(connection,mintId)
        const mint_ata = await getOrCreateAssociatedTokenAccount(connection, provider.wallet, mintId, initializer.publicKey)

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
                new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
                nftmint.address.toBuffer(),
            ],
            new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
        )[0];

        const tx = new Transaction();
        const ix = await program.methods
        .initRoom({
            initializerAmount: new anchor.BN(50),//new anchor.BN(initializerAmount),
            takerAmount: new anchor.BN(70),//new anchor.BN(takerAmount),
            identifier: escrowIdentifier,
        })
        .accounts({
            initializer: provider.wallet.publicKey,
            vaultAuthority: vaultAuthorityId,
            vault: vaultKey,
            nftMint: nftmint.address,// strict supply 1
            nftTokenAccount: mint_ata.address,
            metadataAccount: metadataAccount,
            mint: mintA,
            initializerDepositTokenAccount: initializerTokenAccountA.address,
            initializerReceiveTokenAccount: initializerTokenAccountB.address,
            roomState: escrowStateId,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

        tx.add(ix)
        tx.feePayer = provider.wallet.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
        
        console.log(tx)
        //await sendAndConfirmTransaction(connection, tx, [initializer])
        console.log(metadataAccount)

    }

    const Exchange = async () => {

        const idl = await anchor.Program.fetchIdl(ESCROW_PROGRAM, provider);
        const program = new anchor.Program(idl, ESCROW_PROGRAM, provider);
        const initializer_mintA_ata = await getOrCreateAssociatedTokenAccount(connection,initializer,mintA,initializer.publicKey)
        const initializer_mintB_ata = await getOrCreateAssociatedTokenAccount(connection,initializer,mintB,initializer.publicKey)
        const taker_mintA_ata = await getOrCreateAssociatedTokenAccount(connection,taker,mintA,taker.publicKey)
        const taker_mintB_ata = await getOrCreateAssociatedTokenAccount(connection,taker,mintB,taker.publicKey)
        const initializerTokenAccountA = await getAccount(connection, initializer_mintA_ata.address)
        const initializerTokenAccountB = await getAccount(connection, initializer_mintB_ata.address)
        const takerTokenAccountA = await getAccount(connection, taker_mintA_ata.address)
        const takerTokenAccountB = await getAccount(connection, taker_mintB_ata.address)

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

        const tx = new Transaction();
        const ix = await program.methods
        .exchange()
        .accounts({
            taker: taker.publicKey,
            initializerDepositTokenMint: mintA,
            takerDepositTokenMint: mintB,
            takerDepositTokenAccount: takerTokenAccountB.address,
            takerReceiveTokenAccount: takerTokenAccountA.address,
            initializerDepositTokenAccount: initializerTokenAccountA.address,
            initializerReceiveTokenAccount: initializerTokenAccountB.address,
            initializer: initializer.publicKey,
            roomState: escrowStateId,
            vault: vaultKey,
            vaultAuthority: vaultAuthorityId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()

        tx.add(ix)
        tx.feePayer = provider.wallet.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
        
        console.log(tx)
        await sendAndConfirmTransaction(connection,tx,[taker])
        console.log(takerTokenAccountA)
        console.log(takerTokenAccountB)
    }

    const Cancel = async () => {

        const idl = await anchor.Program.fetchIdl(ESCROW_PROGRAM, provider);
        const program = new anchor.Program(idl, ESCROW_PROGRAM, provider);

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

        const initializer_mintA_ata = await getOrCreateAssociatedTokenAccount(connection,initializer,mintA,initializer.publicKey)
        const initializerTokenAccountA = await getAccount(connection, initializer_mintA_ata.address)

        const tx = new Transaction()
        const ix = await program.methods
        .cancel()
        .accounts({
          initializer: initializer.publicKey,
          mint: mintA,
          initializerDepositTokenAccount: initializerTokenAccountA.address,
          vault: vaultKey,
          vaultAuthority: vaultAuthorityId,
          roomState: escrowStateId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()
        
        tx.add(ix)
        tx.feePayer = provider.wallet.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
        await sendAndConfirmTransaction(connection,tx,[initializer])
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