# Depth-first search

## Description

Write a function that implements the depth-first search algorithm on a directed graph
(in adjacency list format), given a starting node.

## Example

```js
const graph1 = {
 A: ['B', 'C', 'D'],
 B: ['E', 'F'],
 C: ['G', 'H'],
 D: ['I', 'J'],
 E: ['D'],
 F: [],
 G: [],
 H: [],
 I: [],
 J: [],
};
depthFirstSearch(graph1, 'A'); // ['A', 'B', 'E', 'D', 'I', 'J', 'F', 'C', 'G', 'H']
depthFirstSearch(graph1, 'B'); // ['B', 'E', 'D', 'I', 'J', 'F']

const graph2 = {
 'A': ['B', 'C'],
 'B': ['D', 'E'],
 'C': ['F', 'G'],
 'D': [],
 'E': [],
 'F': [],
 'G': [],
};
depthFirstSearch(graph2, 'A')); // ['A', 'B', 'D', 'E', 'C', 'F', 'G']
depthFirstSearch(graph2, 'E')); // ['E']
```
