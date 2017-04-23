import React from 'react'
import { Container, Segment, Header, Button } from 'semantic-ui-react'
import { Link } from 'react-router-dom'

import Navbar from './Navbar'

const Landing = () => {
  return (
    <Container fluid>
      <Navbar type='masthead'>
        <Container className='text-center'>
            <Header className='landing-header' as='h1' inverted>Simple, Fast & Secure Payments</Header>
            <Header as='h3' className='landing-sub-header' inverted>Coinbox is a bitcoin wallet&nbsp;
              based on Bitcore. Its a wallet for all your needs.
            </Header>
              <Button content='Get Started' size='huge' inverted as={Link} to='/signup' />
          </Container>
      </Navbar>

      <Header as='h1'>Landing</Header>
    </Container>

  )
}

export default Landing
