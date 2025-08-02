
import React, { useState, useEffect, useCallback } from 'react';

// --- MOCK CONSTANTS & CONFIG (In a real app, these would be in separate files) ---

const REI_PROGRAM_ID = 'REIprotocL111111111111111111111111111111111';
const PYTH_REI_PRICE_FEED_ID = 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD'; // Example: SOL/USD feed
const MOCK_SOL_PRICE = 145.50; // Using a stable mock SOL price for calculations
const STABILITY_FEE_APR = 2.0; // 2.0% Annual Percentage Rate
const LIQUIDATION_PENALTY_PCT = 10.0; // 10% penalty
const MIN_COLLATERAL_RATIO = 150;

// --- MOCK HELPER FUNCTIONS ---

const getMockPythPrice = async () => {
    const mockPrice = 49.36 + (Math.random() - 0.5) * 0.5;
    return mockPrice;
};

const getMockWalletBalance = async (wallet) => {
    if (!wallet) return 0;
    if (!wallet.mockBalance) wallet.mockBalance = { sol: 50, gov: 1000 };
    return wallet.mockBalance;
};

// --- UI ICONS ---
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.158-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.408.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.713.662c-.666.432-1.28 1.263-1.28 2.242 0 .979.614 1.81 1.28 2.242.666.432 1.713.662 1.713.662v3.092a1 1 0 102 0v-3.092c0 0 1.047-.23 1.713-.662.666-.432 1.28-1.263 1.28-2.242 0-.979-.614-1.81-1.28-2.242A4.535 4.535 0 0011 5.092V5z" clipRule="evenodd" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;


// --- UI COMPONENTS ---

const Header = () => (
    <header className="bg-gray-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-wider">
                <span className="text-green-400">REI</span>-Tracker
            </h1>
            <div className="hidden md:block">
                <span className="text-sm text-gray-400">Synthetic Rare Earth Index Protocol</span>
            </div>
        </div>
    </header>
);

const ConnectWallet = ({ wallet, setWallet }) => {
    const connect = () => {
        const mockWallet = {
            address: 'SoL4n4AddR3ss' + Math.random().toString(36).substring(2, 10),
            mockBalance: { sol: 50, gov: 1000 },
        };
        setWallet(mockWallet);
    };
    const disconnect = () => setWallet(null);

    return (
        <div className="flex justify-center my-6">
            {wallet ? (
                <button onClick={disconnect} className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-red-600 transition-all duration-200">
                    Disconnect Wallet
                </button>
            ) : (
                <button onClick={connect} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-600 transition-all duration-200">
                    Connect Wallet
                </button>
            )}
        </div>
    );
};

const ProtocolStats = ({ reiPrice, tvl, circulatingRei, protocolRevenue }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <p className="text-sm text-gray-400">REI Index Price</p>
            <p className="text-2xl font-semibold text-green-400">${reiPrice.toFixed(4)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <p className="text-sm text-gray-400">Total Value Locked (TVL)</p>
            <p className="text-2xl font-semibold text-white">${tvl.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <p className="text-sm text-gray-400">Circulating REI</p>
            <p className="text-2xl font-semibold text-white">{circulatingRei.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
            <p className="text-sm text-gray-400">Protocol Revenue</p>
            <p className="text-2xl font-semibold text-white">${protocolRevenue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
        </div>
    </div>
);

const Vault = ({ wallet, setWallet, reiPrice, setTvl, setCirculatingRei, setProtocolRevenue }) => {
    const [solBalance, setSolBalance] = useState(0);
    const [solCollateral, setSolCollateral] = useState(0);
    const [reiMinted, setReiMinted] = useState(0);
    const [accruedFees, setAccruedFees] = useState(0);
    const [depositAmount, setDepositAmount] = useState('');
    const [mintAmount, setMintAmount] = useState('');

    const collateralValue = solCollateral * MOCK_SOL_PRICE;
    const debtValue = reiMinted * reiPrice;
    const collateralizationRatio = debtValue > 0 ? (collateralValue / debtValue) * 100 : 0;
    const liquidationPrice = reiMinted > 0 ? (debtValue * (MIN_COLLATERAL_RATIO / 100)) / solCollateral : 0;
    const maxMintable = (collateralValue / reiPrice) / (MIN_COLLATERAL_RATIO / 100);

    const updateBalances = useCallback(async () => {
        if (wallet) {
            const balance = await getMockWalletBalance(wallet);
            setSolBalance(balance.sol);
        }
    }, [wallet]);

    useEffect(() => {
        updateBalances();
    }, [updateBalances]);
    
    // Simulate stability fee accrual
    useEffect(() => {
        if (debtValue > 0) {
            const interval = setInterval(() => {
                const feePerSecond = (debtValue * (STABILITY_FEE_APR / 100)) / (365 * 24 * 60 * 60);
                setAccruedFees(prev => prev + feePerSecond);
                setProtocolRevenue(prev => prev + feePerSecond);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [debtValue, setProtocolRevenue]);

    const handleDeposit = () => {
        const amount = parseFloat(depositAmount);
        if (amount > 0 && amount <= solBalance) {
            setSolCollateral(prev => prev + amount);
            setSolBalance(prev => prev - amount);
            setTvl(prev => prev + (amount * MOCK_SOL_PRICE));
            const newWallet = {...wallet, mockBalance: { ...wallet.mockBalance, sol: wallet.mockBalance.sol - amount }};
            setWallet(newWallet);
            setDepositAmount('');
        } else {
            alert("Invalid deposit amount or insufficient balance.");
        }
    };

    const handleMint = () => {
        const amount = parseFloat(mintAmount);
        if (amount > 0 && (reiMinted + amount) <= maxMintable) {
            setReiMinted(prev => prev + amount);
            setCirculatingRei(prev => prev + amount);
            setMintAmount('');
        } else {
            alert("Invalid mint amount or would fall below minimum collateralization.");
        }
    };

    const handleLiquidation = () => {
        if (collateralizationRatio < MIN_COLLATERAL_RATIO && collateralizationRatio > 0) {
            const penalty = debtValue * (LIQUIDATION_PENALTY_PCT / 100);
            setProtocolRevenue(prev => prev + penalty);
            setTvl(prev => prev - collateralValue);
            setCirculatingRei(prev => prev - reiMinted);
            
            // Reset position
            setSolCollateral(0);
            setReiMinted(0);
            setAccruedFees(0);
            
            alert(`Position liquidated. A ${LIQUIDATION_PENALTY_PCT}% penalty ($${penalty.toFixed(2)}) was sent to the protocol treasury.`);
        } else {
            alert("Position is not eligible for liquidation.");
        }
    };


    if (!wallet) return <p className="text-center text-gray-400">Please connect your wallet to use the protocol.</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side: Position Management */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Your Position</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <StatCard label="Your SOL Balance" value={`${solBalance.toFixed(4)} SOL`} />
                    <StatCard label="SOL Collateral" value={`${solCollateral.toFixed(4)} SOL`} />
                    <StatCard label="REI Minted" value={reiMinted.toFixed(4)} />
                    <StatCard label="Debt Value" value={`$${debtValue.toFixed(2)}`} />
                    <StatCard label="Accrued Fees" value={`$${accruedFees.toFixed(6)}`} isFee={true} />
                    <StatCard label="Liquidation Price" value={liquidationPrice > 0 ? `$${liquidationPrice.toFixed(2)}` : 'N/A'} isWarning={true} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ActionBox title="1. Deposit Collateral" value={depositAmount} setValue={setDepositAmount} placeholder="Amount in SOL" buttonText="Deposit SOL" onClick={handleDeposit} />
                    <ActionBox title="2. Mint REI" value={mintAmount} setValue={setMintAmount} placeholder="Amount to mint" buttonText="Mint REI" onClick={handleMint} disabled={solCollateral <= 0} buttonClass="bg-green-600 hover:bg-green-700" />
                </div>
            </div>

            {/* Right Side: Health & Liquidation */}
            <div>
                 <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Position Health</h2>
                 <p className="text-sm text-center text-gray-400 mb-2">Collateralization Ratio</p>
                <div className="w-full bg-gray-700 rounded-full h-8 mb-2">
                    <div
                        className={`h-8 rounded-full text-sm font-medium text-black text-center p-1.5 leading-none flex items-center justify-center ${collateralizationRatio >= 200 ? 'bg-green-500' : collateralizationRatio >= MIN_COLLATERAL_RATIO ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(collateralizationRatio, 300) / 3}%` }} 
                    >
                       {collateralizationRatio > 0 ? collateralizationRatio.toFixed(2) + '%' : 'N/A'}
                    </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-1">Minimum: {MIN_COLLATERAL_RATIO}%</p>
                <p className="text-xs text-center text-gray-400 mb-6">Max mintable REI: {maxMintable.toFixed(4)}</p>

                <div className="mt-8">
                     <h3 className="font-semibold text-white text-center mb-2">Liquidation</h3>
                     <p className="text-xs text-gray-400 text-center mb-4">If your ratio drops below {MIN_COLLATERAL_RATIO}%, your position can be liquidated by anyone to protect the protocol.</p>
                     <button onClick={handleLiquidation} className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={collateralizationRatio >= MIN_COLLATERAL_RATIO}>
                        Liquidate Position
                    </button>
                </div>
            </div>
        </div>
    );
};

const Governance = ({ wallet, setWallet, protocolRevenue, setProtocolRevenue }) => {
    const [govBalance, setGovBalance] = useState(0);
    const [govPrice, setGovPrice] = useState(2.50);
    const [burnedAmount, setBurnedAmount] = useState(50000);

    const updateBalances = useCallback(async () => {
        if (wallet) {
            const balance = await getMockWalletBalance(wallet);
            setGovBalance(balance.gov);
        }
    }, [wallet]);

    useEffect(() => {
        updateBalances();
    }, [updateBalances]);

    const handleBuybackAndBurn = () => {
        if (protocolRevenue > 1000) {
            const amountToBurn = protocolRevenue / govPrice;
            setBurnedAmount(prev => prev + amountToBurn);
            setProtocolRevenue(0); // Reset revenue after burn
            alert(`🔥 Protocol used $${protocolRevenue.toFixed(0)} to buy back and burn ${amountToBurn.toFixed(2)} GOV tokens!`);
        } else {
            alert("Not enough protocol revenue to perform buyback & burn.");
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-4xl mx-auto mt-8">
            <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Governance & Treasury</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Your GOV Balance" value={wallet ? `${govBalance.toLocaleString()} GOV` : 'N/A'} />
                <StatCard label="GOV Price" value={`$${govPrice.toFixed(2)}`} />
                <StatCard label="Total GOV Burned" value={`${burnedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}`} />
            </div>
            <div className="mt-6 text-center">
                <h3 className="font-semibold text-white">Protocol Treasury</h3>
                <p className="text-gray-400 text-sm mb-4">Revenue from fees and liquidations is used to buy back GOV tokens from the market and burn them, reducing supply and increasing value.</p>
                <button onClick={handleBuybackAndBurn} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 disabled:bg-gray-600" disabled={protocolRevenue < 1000}>
                    <FireIcon />
                    Buyback & Burn
                </button>
            </div>
        </div>
    );
};

// --- HELPER SUB-COMPONENTS ---
const StatCard = ({ label, value, isFee = false, isWarning = false }) => (
    <div className="bg-gray-900 p-3 rounded-md text-center">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-lg font-mono ${isFee ? 'text-yellow-400' : isWarning ? 'text-red-500' : 'text-white'}`}>{value}</p>
    </div>
);

const ActionBox = ({ title, value, setValue, placeholder, buttonText, onClick, disabled = false, buttonClass = "bg-green-500 hover:bg-green-600" }) => (
    <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg">
        <h3 className="font-semibold text-white">{title}</h3>
        <input
            type="number"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:ring-green-500 focus:border-green-500"
        />
        <button onClick={onClick} className={`w-full text-white py-2 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed ${buttonClass}`} disabled={disabled}>
            {buttonText}
        </button>
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
    const [wallet, setWallet] = useState(null);
    const [reiPrice, setReiPrice] = useState(49.36);
    const [tvl, setTvl] = useState(12540000);
    const [circulatingRei, setCirculatingRei] = useState(150000);
    const [protocolRevenue, setProtocolRevenue] = useState(54200);

    useEffect(() => {
        const interval = setInterval(async () => {
            const price = await getMockPythPrice();
            setReiPrice(price);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
            <Header />
            <main className="container mx-auto p-4">
                <ConnectWallet wallet={wallet} setWallet={setWallet} />
                <ProtocolStats
                    reiPrice={reiPrice}
                    tvl={tvl}
                    circulatingRei={circulatingRei}
                    protocolRevenue={protocolRevenue}
                />
                <Vault
                    wallet={wallet}
                    setWallet={setWallet}
                    reiPrice={reiPrice}
                    setTvl={setTvl}
                    setCirculatingRei={setCirculatingRei}
                    setProtocolRevenue={setProtocolRevenue}
                />
                <Governance 
                    wallet={wallet}
                    setWallet={setWallet}
                    protocolRevenue={protocolRevenue}
                    setProtocolRevenue={setProtocolRevenue}
                />
            </main>
            <footer className="text-center p-4 mt-8 text-xs text-gray-500">
                <p>REI-Tracker Protocol is a prototype. Not for production use.</p>
                <p>Program ID: {REI_PROGRAM_ID}</p>
            </footer>
        </div>
    );
}
