import React, { Component } from 'react'
import { Container, Header, Form, Input, Segment, Dropdown, Divider, Menu } from 'semantic-ui-react'
import {NavLink, Link} from 'react-router-dom'

import SecondaryNavbar from './SecondaryNavbar'

class SendMoney extends Component {
  handleSubmit(e) {

  }

  handleChange(e) {

  }

  render () {
    const options = [
      { key: 'INR', text: 'INR', value: 'INR' },
      { key: 'USD', text: 'USD', value: 'USD' },
      { key: 'EUR', text: 'EUR', value: 'EUR' }
    ]
    const walletOptions = [
      { key: 'INR', text: 'Personal Wallet', value: 'personal' },
      { key: 'USD', text: 'Work Wallet', value: 'pwrk' },
      { key: 'EUR', text: 'Family Wallet', value: 'family' }
    ]
    return (
      <Container fluid>
        <SecondaryNavbar>
          <Menu.Menu>
            <Menu.Item as={NavLink} to='/send'>Send</Menu.Item>
            <Menu.Item as={NavLink} to='/request'>Request</Menu.Item>
          </Menu.Menu>
        </SecondaryNavbar>
        <Container text className='send-money' >
          <Segment basic className='padded'>
            <Form onSubmit={this.handleSubmit}>
              <Segment basic padded>
                <Header as='h2'>Send Funds</Header>
                <Divider />
                <Form.Field>
                  <label>Recepient</label>
                  <Input
                    size='large'
                    icon='user circle outline'
                    iconPosition='left'
                    name='email_bitcoin'
                    placeholder='Email or Bitcoin address'
                    onChange={this.handleChange}
                    />
                </Form.Field>
                <Form.Field>
                  <label>Amount</label>
                  <Input
                    action={<Dropdown basic floating options={options} defaultValue='INR' />}
                    size='large'
                    icon='send outline'
                    iconPosition='left'
                    placeholder='Amount'
                    />
                </Form.Field>
                <Form.Field>
                  <label>Chooose Wallet</label>
                  <Dropdown
                    placeholder='Select Wallet'
                    className='wallet-dropdown'
                    fluid
                    selection
                    options={walletOptions}
                  />
                </Form.Field>
                <Form.Field>
                  <Form.TextArea label='Note' placeholder='Optional Message' autoHeight />
                </Form.Field>
              </Segment>
              <Segment basic padded textAlign='center'>
                <Form.Button fluid primary size='large'>Send Money</Form.Button>
              </Segment>
            </Form>
          </Segment>
        </Container>
      </Container>
    )
  }
}

export default SendMoney
