const socket = io();

// Common logic to join a poll room and listen for vote updates
function joinPollRoom(pollId, updateCallback) {
  socket.emit('joinPoll', pollId);
  socket.on('pollData', (poll) => {
    document.getElementById('pollQuestion').innerText = poll.question;
    updateCallback(poll.options);
  });
  socket.on('voteUpdate', (votes) => updateCallback(votes));
}

