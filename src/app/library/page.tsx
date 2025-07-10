'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Modal,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const videos = [
  {
    "title": "Cave edit",
    "youtubeId": "yMaZC5z7m7k",
    "thumbnail": "https://i.ytimg.com/vi/yMaZC5z7m7k/hqdefault.jpg"
  },
  {
    "title": "To the river",
    "youtubeId": "jbOxW0yEa60",
    "thumbnail": "https://i.ytimg.com/vi/jbOxW0yEa60/hqdefault.jpg"
  },
  {
    "title": "Dong Lam 1",
    "youtubeId": "FnooOVbXsfY",
    "thumbnail": "https://i.ytimg.com/vi/FnooOVbXsfY/hqdefault.jpg"
  },
  {
    "title": "Rice paddies",
    "youtubeId": "Skn46ePQnQc",
    "thumbnail": "https://i.ytimg.com/vi/Skn46ePQnQc/hqdefault.jpg"
  },
  {
    "title": "Bamboo boat edit",
    "youtubeId": "navAR-E79JY",
    "thumbnail": "https://i.ytimg.com/vi/navAR-E79JY/hqdefault.jpg"
  },
  {
    "title": "Back from the boat",
    "youtubeId": "U0dwngQ6Shs",
    "thumbnail": "https://i.ytimg.com/vi/U0dwngQ6Shs/hqdefault.jpg"
  },
  {
    "title": "Dong Lam 2",
    "youtubeId": "u_LnBAKwn20",
    "thumbnail": "https://i.ytimg.com/vi/u_LnBAKwn20/hqdefault.jpg"
  },
  {
    "title": "Dong Lam more rocks",
    "youtubeId": "u79vEutS-pQ",
    "thumbnail": "https://i.ytimg.com/vi/u79vEutS-pQ/hqdefault.jpg"
  },
  {
    "title": "Water buffalo",
    "youtubeId": "OvzRpRbUZ7M",
    "thumbnail": "https://i.ytimg.com/vi/OvzRpRbUZ7M/hqdefault.jpg"
  },
  {
    "title": "Approaching the cave",
    "youtubeId": "vApDDgPwqPw",
    "thumbnail": "https://i.ytimg.com/vi/vApDDgPwqPw/hqdefault.jpg"
  },
  {
    "title": "Dong Lam deadend",
    "youtubeId": "z9-Y3nLfClw",
    "thumbnail": "https://i.ytimg.com/vi/z9-Y3nLfClw/hqdefault.jpg"
  },
  {
    "title": "Bumpy roads",
    "youtubeId": "5GRczjwyQ-w",
    "thumbnail": "https://i.ytimg.com/vi/5GRczjwyQ-w/hqdefault.jpg"
  }
]


export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<typeof videos[0] | null>(null);

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (video: typeof videos[0]) => {
    setSelectedVideo(video);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedVideo(null);
  };

  return (
    <Box>
      <Typography variant="h4">
        Video Library
      </Typography>
      <TextField
        label="Search videos"
        variant="outlined"
        fullWidth
        margin="normal"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <Grid container spacing={2}>
        {filteredVideos.map(video => (
          <Grid size={{xs: 6, sm: 6, md: 3, lg: 3}} key={video.youtubeId}>
            <Card
              sx={{
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <CardActionArea onClick={() => handleOpen(video)} sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <CardMedia
                  component="img"
                  image={video.thumbnail}
                  alt={video.title}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    flex: 1
                  }}
                />
                <CardContent
                  sx={{
                    pt: {xs: 0.5, sm: 0.5, md: 0.5}, // Reduce top padding
                    pb: { xs: 2, sm: 0.5, md: 0.5 }, // Increase bottom padding on mobile
                    px: 1
                  }}
                >
                  <Typography variant="subtitle1" noWrap>
                    {video.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="video-modal-title"
        aria-describedby="video-modal-description"
        closeAfterTransition
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 2,
            outline: 'none',
            maxWidth: '90dvw',
            maxHeight: '90dvh',
            width: 600,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
          {selectedVideo && (
            <>
              <Typography id="video-modal-title" variant="h6" gutterBottom>
                {selectedVideo.title}
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '56.25%', // 16:9 aspect ratio
                  mb: 2
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}