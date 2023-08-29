import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    getAccount,
    getMint
} from "@solana/spl-token";
import {  PublicKey } from '@solana/web3.js';

let METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
let ESCROW_PROGRAM = new PublicKey("BGXHsoqm7cXC6PfAXcyPNuyNAzUgGs6iushSr2SJCP1v")

let mintA = new PublicKey('D8J6gcTSLPwXS9h4afZvDEQr2qGxscVfUPnrfbHQxhzJ')
let mintB = new PublicKey('8n7GxVW3ce7vTJ8BDpuiFBfuJFUEdGcNj4cW6vhDS6qk')

export const get_ix = async (anchor, provider, connection, wallet, initializer, taker, escrowIdentifier, mintId) => {

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
export const execute_tx = async (tx, connection, wallet) => {

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