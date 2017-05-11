import React from 'react'
import { Container, Dimmer, Loader as LoaderIcon } from 'semantic-ui-react'


const Loader = ({className}) => {
  return (
    <Container fluid className={className || null}>
      <Dimmer active inverted>
        <LoaderIcon size='large' />
      </Dimmer>
    </Container>
  )
}

export default Loader
