// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PoetryArchive
/// @notice Permanent on-chain archive for poetry and short text on BOT Chain.
///         The chain is a witness, not a custodian: poem content lives in events
///         (cheap, permanent, publicly readable off-chain); only what other
///         functions need to read back (author lookups, hash checks) is stored.
/// @dev Immutable by design: no owner, no pause, no upgradeability, no setter
///      for the fee. Emergency response happens at the frontend level.
contract PoetryArchive {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------
    // Username registry
    // ---------------------------------------------------------------

    mapping(address => string) public addressToUsername;
    mapping(string => address) public usernameToAddress;

    event UsernameClaimed(address indexed user, string username, uint256 timestamp);

    function claimUsername(string calldata username) external {
        require(bytes(username).length > 0 && bytes(username).length <= 32, "Invalid username length");
        require(usernameToAddress[username] == address(0), "Username taken");
        require(bytes(addressToUsername[msg.sender]).length == 0, "Address already has a username");
        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;
        emit UsernameClaimed(msg.sender, username, block.timestamp);
    }

    // ---------------------------------------------------------------
    // Poems — content in events, not storage
    // ---------------------------------------------------------------

    enum License {
        AllRightsReserved,
        CC0,
        CC_BY,
        CC_BY_SA
    }

    uint256 public nextPoemId;
    mapping(uint256 => address) public poemAuthor;
    mapping(uint256 => bytes32) public poemContentHash;
    mapping(bytes32 => bool) public hashExists;

    event PoemPosted(
        address indexed author,
        uint256 indexed poemId,
        uint256 indexed parentPoemId,
        string title,
        string content,
        uint8 license,
        uint256 timestamp
    );

    function postPoem(
        string calldata title,
        string calldata content,
        uint256 parentPoemId,
        License license
    ) external returns (uint256) {
        require(bytes(addressToUsername[msg.sender]).length > 0, "Must claim a username before posting");
        require(bytes(content).length > 0, "Content required");
        if (parentPoemId != 0) {
            require(poemAuthor[parentPoemId] != address(0), "Parent poem does not exist");
        }
        bytes32 contentHash = keccak256(abi.encodePacked(content));
        require(!hashExists[contentHash], "Duplicate content already posted");

        uint256 poemId = ++nextPoemId; // start at 1, so 0 can mean "no parent"
        poemAuthor[poemId] = msg.sender;
        poemContentHash[poemId] = contentHash;
        hashExists[contentHash] = true;

        emit PoemPosted(msg.sender, poemId, parentPoemId, title, content, uint8(license), block.timestamp);
        return poemId;
    }

    // ---------------------------------------------------------------
    // Tipping with platform fee
    // ---------------------------------------------------------------

    IERC20 public immutable usdtToken; // BOT Chain USDT
    address public immutable platformFeeRecipient;
    uint16 public constant PLATFORM_FEE_BPS = 300; // 3%, immutable, hardcoded, no setter

    event PoemTipped(uint256 indexed poemId, address indexed tipper, address indexed author, address token, uint256 amount, uint256 fee);

    constructor(address _usdtToken, address _platformFeeRecipient) {
        require(_usdtToken != address(0), "USDT address required");
        require(_platformFeeRecipient != address(0), "Fee recipient required");
        usdtToken = IERC20(_usdtToken);
        platformFeeRecipient = _platformFeeRecipient;
    }

    function tipPoemUSDT(uint256 poemId, uint256 amount) external {
        address author = poemAuthor[poemId];
        require(author != address(0), "Poem does not exist");
        require(msg.sender != author, "Cannot tip yourself");
        require(amount > 0, "Amount must be greater than zero");

        uint256 fee = (amount * PLATFORM_FEE_BPS) / 10000;
        uint256 authorAmount = amount - fee;

        usdtToken.safeTransferFrom(msg.sender, author, authorAmount);
        if (fee > 0) {
            usdtToken.safeTransferFrom(msg.sender, platformFeeRecipient, fee);
        }
        emit PoemTipped(poemId, msg.sender, author, address(usdtToken), amount, fee);
    }

    function tipPoemBOT(uint256 poemId) external payable {
        address author = poemAuthor[poemId];
        require(author != address(0), "Poem does not exist");
        require(msg.sender != author, "Cannot tip yourself");
        require(msg.value > 0, "Amount must be greater than zero");

        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 authorAmount = msg.value - fee;

        (bool sentAuthor, ) = author.call{value: authorAmount}("");
        require(sentAuthor, "Transfer to author failed");
        if (fee > 0) {
            (bool sentFee, ) = platformFeeRecipient.call{value: fee}("");
            require(sentFee, "Transfer of fee failed");
        }
        emit PoemTipped(poemId, msg.sender, author, address(0), msg.value, fee);
    }
}
