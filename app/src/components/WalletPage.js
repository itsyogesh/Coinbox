import React, { Component } from 'react'
import { Container, Menu, Button, Header, Table, Label } from 'semantic-ui-react'
import { Link } from 'react-router-dom'

import SecondaryNavbar from './SecondaryNavbar'

class WalletPage extends Component {
  render() {
    return (
      <Container fluid>
        <SecondaryNavbar>
          <Menu.Item header>
            <Header as='h3'>Wallets</Header>
          </Menu.Item>
          <Menu.Menu position='right'>
            <Menu.Item>
              <Button as={Link} to='/signup' primary>New Wallet</Button>
            </Menu.Item>
          </Menu.Menu>
        </SecondaryNavbar>
        <Container fluid className='wallets'>
          <Table padded>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Label</Table.HeaderCell>
            <Table.HeaderCell>Balance</Table.HeaderCell>
            <Table.HeaderCell>Last Activity</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <Header as='h4'>
                Personal Wallet <Label basic>Default</Label>
              </Header>
            </Table.Cell>
            <Table.Cell>192.01 INR</Table.Cell>
            <Table.Cell>
              25 days ago
            </Table.Cell>
            <Table.Cell>
              <Link to='/actions'>Rename</Link><br />
              <Link to='/actions'>Delete</Link><br />
              <Link to='/actions'>Set as Default</Link><br />
              <Link to='/actions'>Get Bitcoin address</Link>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
        </Container>
      </Container>
    )
  }
}

export default WalletPage
