pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";

/*
choice: integer that we'll check meets constraint:  0 <= choice < 3
hash: TODO

*/
template makeChoice () {  

   // Declaration of signals.  
   signal input choice;
   signal input salt;
   signal output out;
   signal output pub1;

   // Constraints.  
   component lt3 = LessThan(32);
   lt3.in[0] <== choice;
   lt3.in[1] <== 3;

   component gtEq = GreaterEqThan(32);
   gtEq.in[0] <== choice;
   gtEq.in[1] <== 0;

   component and1 = AND();
   and1.a <== lt3.out;
   and1.b <== gtEq.out;

   component eq = IsEqual();
   eq.in[0] <== and1.out;
   eq.in[1] <== 1;

   out <== eq.out;

    /* check MiMCSponge(choice) = pub1 */
    /*
        220 = 2 * ceil(log_5 p), as specified by mimc paper, where
        p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    */
   component mimc1 = MiMCSponge(1, 220, 1);
   mimc1.ins[0] <== choice;
   mimc1.k <== salt;
   pub1 <== mimc1.outs[0];
}

component main = makeChoice();
