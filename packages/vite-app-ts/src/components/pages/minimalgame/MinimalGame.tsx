import { FC, useContext, useEffect, useState } from 'react';
import { useEthersContext } from 'eth-hooks/context';
import { useContractReader, useGasPrice } from 'eth-hooks';
import { transactor } from 'eth-components/functions';

import { useAppContracts } from '~~/config/contractContext';
import { ChoiceForm } from './ChoiceForm';
import { RevealForm } from './RevealForm';
import { EndGameForm } from './EndGameForm';
import { EthComponentsSettingsContext } from 'eth-components/models';
import { logTransactionUpdate } from '~~/components/common';
import { buildChoice, generateSalt } from './zk_utils';
import { MinimalGame as ContractTypes } from '../../../generated/contract-types/MinimalGame'

export interface IMinimalGameProps {
}

function choiceToText(choice: number) {
    if (choice == 0) {
        return 'rock'
    } else if (choice == 1) {
        return 'paper'
    } else if (choice == 2) {
        return 'scissors'
    }
}

export const MinimalGame: FC<IMinimalGameProps> = (props) => {
    const ethersContext = useEthersContext();
    const minimalGameContract = useAppContracts('MinimalGame', ethersContext.chainId);

    const ethComponentsSettings = useContext(EthComponentsSettingsContext);
    const [gasPrice] = useGasPrice(ethersContext.chainId, 'fast');
    const tx = transactor(ethComponentsSettings, ethersContext?.signer, gasPrice);

    const [gameId] = useContractReader(minimalGameContract, minimalGameContract?.getGameId, []);

    const nullAddress = "0x0000000000000000000000000000000000000000"

    // TODO add event for when game object is updated
    const [game] = useContractReader(minimalGameContract, minimalGameContract?.getGame, [gameId || 0], minimalGameContract?.filters.GameUpdated());
    const [gameObject, setGameObject] = useState<ContractTypes.GameStruct>();
    const [currentlyPlaying, setCurrentlyPlaying] = useState<boolean>(false);
    const [revealedChoice, setRevealedChoice] = useState<boolean>(false);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [opponent, setOpponent] = useState<string>(nullAddress);

    const [latestGame] = useContractReader(minimalGameContract, minimalGameContract?.getGame, [Number(localStorage.getItem("gameId"))]);
    const [latestGameObject, setLatestGameObject] = useState<ContractTypes.GameStruct>();
    const [gameTimeRemaining, setGameTimeRemaining] = useState<string>()

    useEffect(() => {
        if (game) {
            // TODO move this to utility code: createGameStruct  
            let player1: ContractTypes.PlayerStruct = {
                id: game[0][0],
                proof: game[0][1],
                choice: game[0][2],
            }
            let player2: ContractTypes.PlayerStruct = {
                id: game[1][0],
                proof: game[1][1],
                choice: game[1][2],
            }
            let gameObj: ContractTypes.GameStruct = {
                player1: player1,
                player2: player2,
                winner: game[2],
                start_time: game[3],
            }
            setGameObject(gameObj);

            if (gameObj?.player1.id.toString() != nullAddress && gameObj?.player2.id.toString() != nullAddress) {
                setGameStarted(true);

                // determine opponent
                const currentAccount = ethersContext?.account?.toString();
                let currentPlayer: any = null;
                if (currentAccount == gameObj.player1.id.toString()) {
                    setOpponent(gameObj.player2.id.toString());
                    currentPlayer = gameObj.player1;
                } else if (currentAccount == gameObj.player2.id.toString()) {
                    setOpponent(gameObj.player1.id.toString());
                    currentPlayer = gameObj.player2;
                } else {
                    console.warn("Player not in game!");
                }

                // determine if player has revealed yet
                if (currentPlayer) {
                    if (currentPlayer.choice.toNumber() != -1) {
                        setRevealedChoice(true);
                    } else {
                        setRevealedChoice(false);
                    }
                }
            } else {
                setRevealedChoice(false);
            }
        }
        if ((gameId?.toNumber() || 0) == 0) {
            setRevealedChoice(false);
            setGameStarted(false);
        }

        setCurrentlyPlaying((gameId?.toNumber() || 0) > 0)

        // update storage with latest gameId
        if (gameId?.toNumber()) {
            localStorage.setItem("gameId", gameId.toNumber().toString());
        }

    }, [gameId, game, latestGame]);


    useEffect(() => {
        if (latestGame) {
            // TODO move this to utility code: createGameStruct  
            let player1: ContractTypes.PlayerStruct = {
                id: latestGame[0][0],
                proof: latestGame[0][1],
                choice: latestGame[0][2],
            }
            let player2: ContractTypes.PlayerStruct = {
                id: latestGame[1][0],
                proof: latestGame[1][1],
                choice: latestGame[1][2],
            }
            let latestObj: ContractTypes.GameStruct = {
                player1: player1,
                player2: player2,
                winner: latestGame[2],
                start_time: latestGame[3],
            }
            setLatestGameObject(latestObj);
        }
    }, [latestGame]);

    useEffect(() => {
        const intervalId = setInterval(() => {  //assign interval to a variable to clear it.
            if (gameObject) {
                // determine remaining game time
                const currentDate = new Date()
                const endDate = new Date(gameObject.start_time * 1000 + 86400 * 1000)
                const secondsDiff = Math.floor(endDate / 1000) - Math.floor(currentDate / 1000)

                if (secondsDiff > 0) {
                    const diff = new Date(secondsDiff * 1000);

                    setGameTimeRemaining(diff.getHours() + " hr(s) " + diff.getMinutes() + " minute(s) " + diff.getSeconds() + " second(s)")
                } else {
                    setGameTimeRemaining("")
                }
            }
        }, 1)

        return () => clearInterval(intervalId);
    }, [gameObject])

    const onChoiceSubmission = async (choice: string) => {
        let intChoice = -1;
        if (choice == "rock") {
            intChoice = 0;
        } else if (choice == "paper") {
            intChoice = 1;
        } else if (choice == "scissors") {
            intChoice = 2;
        }

        let salt = generateSalt()

        let zkChoice = await buildChoice(intChoice, salt)

        localStorage.setItem("choice", intChoice.toString());
        localStorage.setItem("salt", salt);

        const result = tx?.(minimalGameContract?.joinGame(
            zkChoice['proofArgs'][0],
            zkChoice['proofArgs'][1],
            zkChoice['proofArgs'][2],
            zkChoice['proofArgs'][3],
            zkChoice['publicSignals']
        ), (update: any) => {
            logTransactionUpdate(update);
        });
        console.log("awaiting metamask/web3 confirm result...", result);
        const unused = await result;
    }

    const onRevealSubmission = async () => {
        let latestChoice = Number(localStorage.getItem("choice"));
        let latestSalt = localStorage.getItem("salt") || '';

        const result = tx?.(minimalGameContract?.revealChoice(
            latestChoice,
            latestSalt
        ), (update: any) => {
            logTransactionUpdate(update);
        });
        console.log("awaiting metamask/web3 confirm result...", result);
        const unused = await result;
    }

    const onEndGameSubmission = async () => {
        const result = tx?.(minimalGameContract?.endGame(), (update: any) => {
            logTransactionUpdate(update);
        });
        console.log("awaiting metamask/web3 confirm result...", result);
        const unused = await result;
    }

    return (
        <div>
            {
                currentlyPlaying
                    ? (
                        gameStarted
                            ? (
                                revealedChoice
                                    ? <EndGameForm
                                        onSubmit={onEndGameSubmission}
                                        gameTimeRemaining={gameTimeRemaining || 'NaN'}
                                    />
                                    : <div>
                                        <div>You have {gameTimeRemaining} to respond</div>
                                        <RevealForm
                                            opponent={opponent}
                                            onSubmit={onRevealSubmission}
                                        />
                                    </div>
                            )
                            : <div>
                                Waiting for other player to join...
                            </div>
                    )
                    : <ChoiceForm
                        onSubmit={onChoiceSubmission}
                    />
            }
            <div>
                Latest Game Stats:
                {
                    latestGameObject && (latestGameObject.winner != nullAddress)
                        ? <div>
                            <div>Game ID: {localStorage.getItem("gameId")}</div>
                            <div>Winner: {latestGameObject?.winner} </div>
                            <div>Game Started at {new Date(latestGameObject?.start_time * 1000).toISOString()}</div>
                            <div>You chose: {
                                latestGameObject?.player1.id.toString() == opponent
                                    ? choiceToText(latestGameObject?.player2.choice.toNumber())
                                    : choiceToText(latestGameObject?.player1.choice.toNumber())
                            } </div>
                            <div>They chose: {
                                latestGameObject?.player1.id.toString() == opponent
                                    ? choiceToText(latestGameObject?.player1.choice.toNumber())
                                    : choiceToText(latestGameObject?.player2.choice.toNumber())
                            } </div>
                            <div>You
                                {
                                    latestGameObject?.winner == ethersContext?.account?.toString()
                                        ? " won!"
                                        : latestGameObject?.winner == opponent
                                            ? " lost."
                                            : " tied!"
                                }
                            </div>
                        </div>
                        : <div>Last game not available</div>
                }

            </div>
        </div>
    );
}