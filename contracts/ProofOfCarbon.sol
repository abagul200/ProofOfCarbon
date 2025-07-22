// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ProofOfCarbon is ERC20, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18;
    
    struct CarbonCredit {
        uint256 amount;
        string projectId;
        uint256 verificationDate;
        address verifiedBy;
    }


    mapping(address => CarbonCredit[]) public credits;
    mapping(string => bool) public usedProjectIds;

    constructor() ERC20("ProofOfCarbon", "POC") {
        _mint(msg.sender, INITIAL_SUPPLY);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function verifyCarbonCredit(
        address recipient,
        uint256 amount,
        string memory projectId
    ) external onlyRole(VERIFIER_ROLE) {
        require(!usedProjectIds[projectId], "Project ID already used");
        
        credits[recipient].push(CarbonCredit({
            amount: amount,
            projectId: projectId,
            verificationDate: block.timestamp,
            verifiedBy: msg.sender
        }));
        
        usedProjectIds[projectId] = true;
        _mint(recipient, amount);
    }

    function revokeVerification(
        address recipient,
        string memory projectId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i = 0; i < credits[recipient].length; i++) {
            if (keccak256(bytes(credits[recipient][i].projectId)) == keccak256(bytes(projectId))) {
                _burn(recipient, credits[recipient][i].amount);
                delete credits[recipient][i];
                break;
            }
        }
    }

    function addVerifier(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, account);
    }

    function getCreditCount(address account) external view returns (uint256) {
        return credits[account].length;
    }
}
